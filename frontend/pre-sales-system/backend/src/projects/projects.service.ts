import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    // 生成项目编号
    const projectNo = await this.generateProjectNo();

    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        projectNo,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    return {
      message: '项目创建成功',
      project,
    };
  }

  async findAll(query: QueryProjectsDto) {
    const {
      page = 1,
      pageSize = 10,
      status,
      priority,
      currentStage,
      createdBy,
      assignedTo,
      keyword,
    } = query;

    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (currentStage) where.currentStage = currentStage;
    if (createdBy) where.createdBy = createdBy;
    if (assignedTo) where.assignedTo = assignedTo;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { customerName: { contains: keyword, mode: 'insensitive' } },
        { projectNo: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
          opportunities: {
            select: {
              id: true,
              name: true,
              status: true,
              winProbability: true,
            },
          },
          _count: {
            select: {
              opportunities: true,
              activities: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
            avatar: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
            avatar: true,
          },
        },
        opportunities: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
        },
        solutions: {
          include: {
            documents: true,
          },
        },
        activities: {
          orderBy: { activityDate: 'desc' },
          include: {
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
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    return {
      message: '项目更新成功',
      project: updated,
    };
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return {
      message: '项目删除成功',
    };
  }

  async getActivities(projectId: string) {
    const activities = await this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { activityDate: 'desc' },
      include: {
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

    return activities;
  }

  async addActivity(projectId: string, activityData: any, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const activity = await this.prisma.activity.create({
      data: {
        ...activityData,
        projectId,
        createdBy: userId,
      },
    });

    return {
      message: '活动记录添加成功',
      activity,
    };
  }

  private async generateProjectNo(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const count = await this.prisma.project.count({
      where: {
        projectNo: {
          startsWith: `PRJ${year}${month}`,
        },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `PRJ${year}${month}${seq}`;
  }
}
