import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto, AddMemberDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    // 验证负责人是否存在
    const leader = await this.prisma.user.findUnique({
      where: { id: createTeamDto.leaderId },
    });

    if (!leader) {
      throw new NotFoundException('负责人不存在');
    }

    // 生成团队编号
    const teamNo = await this.generateTeamNo();

    const team = await this.prisma.team.create({
      data: {
        teamNo,
        name: createTeamDto.name,
        description: createTeamDto.description,
        leaderId: createTeamDto.leaderId,
        department: createTeamDto.department,
        memberCount: 1,
        status: createTeamDto.status || 'ACTIVE',
      },
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            department: true,
          },
        },
      },
    });

    // 自动将负责人添加为团队成员
    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: createTeamDto.leaderId,
        role: '团队负责人',
      },
    });

    return team;
  }

  async findAll(department?: string) {
    const where = department ? { department } : {};

    return this.prisma.team.findMany({
      where,
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
          },
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
                email: true,
                phone: true,
                department: true,
                position: true,
              },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    return team;
  }

  async findMembers(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
                email: true,
                phone: true,
                department: true,
                position: true,
                avatar: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    return team.members;
  }

  async addMember(id: string, addMemberDto: AddMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: addMemberDto.userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户是否已是团队成员
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: addMemberDto.userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('用户已是团队成员');
    }

    // 添加成员
    const member = await this.prisma.teamMember.create({
      data: {
        teamId: id,
        userId: addMemberDto.userId,
        role: addMemberDto.role || '成员',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            department: true,
          },
        },
      },
    });

    // 更新成员数量
    await this.prisma.team.update({
      where: { id },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    return member;
  }

  async removeMember(id: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 不能移除团队负责人
    if (team.leaderId === userId) {
      throw new BadRequestException('不能移除团队负责人');
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    await this.prisma.teamMember.delete({
      where: { id: member.id },
    });

    // 更新成员数量
    await this.prisma.team.update({
      where: { id },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });

    return { message: '成员移除成功' };
  }

  async findTeamTasks(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    return this.prisma.task.findMany({
      where: { teamId: id },
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 如果更新负责人，验证新负责人是否存在
    if (updateTeamDto.leaderId) {
      const leader = await this.prisma.user.findUnique({
        where: { id: updateTeamDto.leaderId },
      });

      if (!leader) {
        throw new NotFoundException('新负责人不存在');
      }
    }

    return this.prisma.team.update({
      where: { id },
      data: updateTeamDto,
    });
  }

  async remove(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 检查是否有进行中的任务
    const activeTasks = await this.prisma.task.count({
      where: {
        teamId: id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (activeTasks > 0) {
      throw new BadRequestException('团队有进行中的任务，无法删除');
    }

    await this.prisma.team.delete({
      where: { id },
    });

    return { message: '团队删除成功' };
  }

  async getWorkloadStatistics() {
    // 获取所有团队成员的工作量统计
    const members = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        assignedTasks: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        },
        timeLogs: {
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
        },
      },
    });

    const statistics = members.map((member) => {
      const totalTasks = member.assignedTasks.length;
      const pendingTasks = member.assignedTasks.filter((t) => t.status === 'PENDING').length;
      const inProgressTasks = member.assignedTasks.filter((t) => t.status === 'IN_PROGRESS').length;
      const totalHours = member.timeLogs.reduce((sum, log) => sum + log.hours, 0);

      return {
        userId: member.id,
        username: member.username,
        realName: member.realName,
        department: member.department,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        totalHours,
      };
    });

    // 按总工时排序
    statistics.sort((a, b) => b.totalHours - a.totalHours);

    return {
      totalMembers: members.length,
      activeMembers: statistics.filter((s) => s.totalTasks > 0).length,
      totalTasks: statistics.reduce((sum, s) => sum + s.totalTasks, 0),
      totalHours: statistics.reduce((sum, s) => sum + s.totalHours, 0),
      members: statistics,
    };
  }

  private async generateTeamNo(): Promise<string> {
    const prefix = 'TM';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 查找当月团队数量
    const count = await this.prisma.team.count({
      where: {
        teamNo: {
          startsWith: `${prefix}${dateStr}`,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${dateStr}${sequence}`;
  }
}
