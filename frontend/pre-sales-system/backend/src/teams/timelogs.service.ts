import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeLogDto, UpdateTimeLogDto } from './dto/timelog.dto';

interface FindAllParams {
  taskId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TimeLogsService {
  constructor(private prisma: PrismaService) {}

  async create(createTimeLogDto: CreateTimeLogDto) {
    // 验证任务是否存在
    const task = await this.prisma.task.findUnique({
      where: { id: createTimeLogDto.taskId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: createTimeLogDto.userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证工时时间
    if (createTimeLogDto.hours <= 0) {
      throw new BadRequestException('工时必须大于0');
    }

    const timeLog = await this.prisma.timeLog.create({
      data: {
        taskId: createTimeLogDto.taskId,
        userId: createTimeLogDto.userId,
        date: new Date(createTimeLogDto.date),
        hours: createTimeLogDto.hours,
        description: createTimeLogDto.description,
      },
      include: {
        task: {
          select: {
            id: true,
            taskNo: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    // 更新任务的实际工时
    await this.updateTaskActualHours(createTimeLogDto.taskId);

    return timeLog;
  }

  async findAll(params: FindAllParams) {
    const where: any = {};

    if (params.taskId) where.taskId = params.taskId;
    if (params.userId) where.userId = params.userId;
    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate);
      if (params.endDate) where.date.lte = new Date(params.endDate);
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [timeLogs, total] = await Promise.all([
      this.prisma.timeLog.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              taskNo: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.timeLog.count({ where }),
    ]);

    return {
      data: timeLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStatistics(userId: string, startDate?: string, endDate?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const where: any = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const timeLogs = await this.prisma.timeLog.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            taskNo: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);
    const taskCount = new Set(timeLogs.map((log) => log.taskId)).size;

    // 按日期分组统计
    const dailyStats = timeLogs.reduce((acc, log) => {
      const dateKey = log.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, hours: 0, count: 0 };
      }
      acc[dateKey].hours += log.hours;
      acc[dateKey].count += 1;
      return acc;
    }, {} as Record<string, { date: string; hours: number; count: number }>);

    return {
      userId,
      username: user.username,
      realName: user.realName,
      totalHours,
      taskCount,
      timeLogsCount: timeLogs.length,
      dailyStats: Object.values(dailyStats),
      recentLogs: timeLogs.slice(0, 10),
    };
  }

  async getTaskStatistics(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const timeLogs = await this.prisma.timeLog.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);

    // 按用户分组统计
    const userStats = timeLogs.reduce((acc, log) => {
      if (!acc[log.userId]) {
        acc[log.userId] = {
          userId: log.user.id,
          username: log.user.username,
          realName: log.user.realName,
          hours: 0,
          count: 0,
        };
      }
      acc[log.userId].hours += log.hours;
      acc[log.userId].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      taskId,
      taskNo: task.taskNo,
      title: task.title,
      estimatedHours: task.estimatedHours,
      actualHours: totalHours,
      remainingHours: task.estimatedHours ? task.estimatedHours - totalHours : null,
      efficiency: task.estimatedHours ? (totalHours / task.estimatedHours) * 100 : null,
      timeLogsCount: timeLogs.length,
      userStats: Object.values(userStats),
      recentLogs: timeLogs.slice(0, 10),
    };
  }

  async findOne(id: string) {
    const timeLog = await this.prisma.timeLog.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    if (!timeLog) {
      throw new NotFoundException('工时记录不存在');
    }

    return timeLog;
  }

  async update(id: string, updateTimeLogDto: UpdateTimeLogDto) {
    const timeLog = await this.prisma.timeLog.findUnique({
      where: { id },
    });

    if (!timeLog) {
      throw new NotFoundException('工时记录不存在');
    }

    // 验证工时时间
    if (updateTimeLogDto.hours !== undefined && updateTimeLogDto.hours <= 0) {
      throw new BadRequestException('工时必须大于0');
    }

    const updatedTimeLog = await this.prisma.timeLog.update({
      where: { id },
      data: {
        hours: updateTimeLogDto.hours,
        date: updateTimeLogDto.date ? new Date(updateTimeLogDto.date) : undefined,
        description: updateTimeLogDto.description,
      },
      include: {
        task: {
          select: {
            id: true,
            taskNo: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    // 更新任务的实际工时
    await this.updateTaskActualHours(timeLog.taskId);

    return updatedTimeLog;
  }

  async remove(id: string) {
    const timeLog = await this.prisma.timeLog.findUnique({
      where: { id },
    });

    if (!timeLog) {
      throw new NotFoundException('工时记录不存在');
    }

    const taskId = timeLog.taskId;

    await this.prisma.timeLog.delete({
      where: { id },
    });

    // 更新任务的实际工时
    await this.updateTaskActualHours(taskId);

    return { message: '工时记录删除成功' };
  }

  private async updateTaskActualHours(taskId: string) {
    const timeLogs = await this.prisma.timeLog.findMany({
      where: { taskId },
    });

    const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);

    await this.prisma.task.update({
      where: { id: taskId },
      data: { actualHours: totalHours || null },
    });
  }
}
