import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, AddSubTaskDto } from './dto/task.dto';

interface FindAllParams {
  projectId?: string;
  teamId?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto) {
    // 验证被分配人是否存在
    if (createTaskDto.assignedTo) {
      const user = await this.prisma.user.findUnique({
        where: { id: createTaskDto.assignedTo },
      });

      if (!user) {
        throw new NotFoundException('被分配人不存在');
      }
    }

    // 验证项目是否存在
    if (createTaskDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createTaskDto.projectId },
      });

      if (!project) {
        throw new NotFoundException('项目不存在');
      }
    }

    // 验证团队是否存在
    if (createTaskDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: createTaskDto.teamId },
      });

      if (!team) {
        throw new NotFoundException('团队不存在');
      }
    }

    // 生成任务编号
    const taskNo = await this.generateTaskNo();

    // 如果是子任务，检查父任务是否存在
    if (createTaskDto.parentTaskId) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: createTaskDto.parentTaskId },
      });

      if (!parentTask) {
        throw new NotFoundException('父任务不存在');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        taskNo,
        title: createTaskDto.title,
        description: createTaskDto.description,
        projectId: createTaskDto.projectId,
        teamId: createTaskDto.teamId,
        assignedTo: createTaskDto.assignedTo,
        parentTaskId: createTaskDto.parentTaskId,
        status: createTaskDto.status || 'PENDING',
        priority: createTaskDto.priority || 'MEDIUM',
        progress: 0,
        startDate: createTaskDto.startDate,
        dueDate: createTaskDto.dueDate,
        estimatedHours: createTaskDto.estimatedHours,
        tags: createTaskDto.tags,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
        project: {
          select: {
            id: true,
            projectNo: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            teamNo: true,
            name: true,
          },
        },
      },
    });

    return task;
  }

  async findAll(params: FindAllParams) {
    const where: any = {};

    if (params.projectId) where.projectId = params.projectId;
    if (params.teamId) where.teamId = params.teamId;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              realName: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              projectNo: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              teamNo: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              taskNo: true,
              title: true,
            },
          },
          children: {
            select: {
              id: true,
              taskNo: true,
              title: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyTasks(assignedTo: string, status?: string) {
    const where: any = { assignedTo };
    if (status) where.status = status;

    return this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectNo: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            teamNo: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getTaskSummary() {
    const [totalTasks, pendingTasks, inProgressTasks, completedTasks, highPriorityTasks] =
      await Promise.all([
        this.prisma.task.count(),
        this.prisma.task.count({ where: { status: 'PENDING' } }),
        this.prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.task.count({ where: { status: 'COMPLETED' } }),
        this.prisma.task.count({ where: { priority: 'HIGH' } }),
      ]);

    const overdueTasks = await this.prisma.task.count({
      where: {
        dueDate: {
          lt: new Date(),
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
    });

    return {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      highPriorityTasks,
      overdueTasks,
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            projectNo: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            teamNo: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            taskNo: true,
            title: true,
          },
        },
        children: {
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        timeLogs: {
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
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    return task;
  }

  async findSubTasks(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    return this.prisma.task.findMany({
      where: { parentTaskId: id },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addSubTask(id: string, addSubTaskDto: AddSubTaskDto) {
    const parentTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!parentTask) {
      throw new NotFoundException('父任务不存在');
    }

    // 生成子任务编号
    const taskNo = await this.generateTaskNo();

    return this.prisma.task.create({
      data: {
        taskNo,
        title: addSubTaskDto.title,
        description: addSubTaskDto.description,
        parentTaskId: id,
        projectId: parentTask.projectId,
        teamId: parentTask.teamId,
        assignedTo: addSubTaskDto.assignedTo || parentTask.assignedTo,
        status: 'PENDING',
        priority: addSubTaskDto.priority || 'MEDIUM',
        dueDate: addSubTaskDto.dueDate,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    // 验证被分配人是否存在
    if (updateTaskDto.assignedTo) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateTaskDto.assignedTo },
      });

      if (!user) {
        throw new NotFoundException('被分配人不存在');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });
  }

  async updateProgress(id: string, progress: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (progress < 0 || progress > 100) {
      throw new BadRequestException('进度必须在0-100之间');
    }

    let status = task.status;
    if (progress === 100) {
      status = 'COMPLETED';
    } else if (progress > 0 && status === 'PENDING') {
      status = 'IN_PROGRESS';
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        progress,
        status,
      },
    });

    // 如果有子任务，更新父任务的进度
    if (task.parentTaskId) {
      await this.updateParentProgress(task.parentTaskId);
    }

    return updatedTask;
  }

  async completeTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.status === 'COMPLETED') {
      throw new BadRequestException('任务已完成');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
      },
    });

    // 如果有子任务，更新父任务的进度
    if (task.parentTaskId) {
      await this.updateParentProgress(task.parentTaskId);
    }

    return updatedTask;
  }

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    // 如果有子任务，不能删除
    const childTasks = await this.prisma.task.count({
      where: { parentTaskId: id },
    });

    if (childTasks > 0) {
      throw new BadRequestException('存在子任务，无法删除');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: '任务删除成功' };
  }

  private async updateParentProgress(parentTaskId: string) {
    const children = await this.prisma.task.findMany({
      where: { parentTaskId },
    });

    if (children.length === 0) return;

    const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
    const averageProgress = Math.round(totalProgress / children.length);

    let status = 'IN_PROGRESS';
    if (averageProgress === 100) {
      status = 'COMPLETED';
    } else if (averageProgress === 0) {
      status = 'PENDING';
    }

    await this.prisma.task.update({
      where: { id: parentTaskId },
      data: {
        progress: averageProgress,
        status,
      },
    });
  }

  private async generateTaskNo(): Promise<string> {
    const prefix = 'TSK';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 查找当月任务数量
    const count = await this.prisma.task.count({
      where: {
        taskNo: {
          startsWith: `${prefix}${dateStr}`,
        },
      },
    });

    const sequence = String(count + 1).padStart(6, '0');
    return `${prefix}${dateStr}${sequence}`;
  }
}
