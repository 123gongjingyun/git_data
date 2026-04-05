import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

interface FindAllParams {
  type?: string;
  level?: string;
  status?: string;
  industry?: string;
  owner?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    // 验证负责人是否存在
    const owner = await this.prisma.user.findUnique({
      where: { id: createCustomerDto.owner },
    });

    if (!owner) {
      throw new NotFoundException('负责人不存在');
    }

    // 生成客户编号
    const customerNo = await this.generateCustomerNo();

    const customer = await this.prisma.customer.create({
      data: {
        customerNo,
        name: createCustomerDto.name,
        type: createCustomerDto.type || 'POTENTIAL',
        industry: createCustomerDto.industry,
        region: createCustomerDto.region,
        address: createCustomerDto.address,
        website: createCustomerDto.website,
        scale: createCustomerDto.scale,
        level: createCustomerDto.level || 'C',
        phone: createCustomerDto.phone,
        email: createCustomerDto.email,
        status: createCustomerDto.status || 'ACTIVE',
        owner: createCustomerDto.owner,
      },
      include: {
        ownerUser: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    return customer;
  }

  async findAll(params: FindAllParams) {
    const where: any = {};

    if (params.type) where.type = params.type;
    if (params.level) where.level = params.level;
    if (params.status) where.status = params.status;
    if (params.industry) where.industry = params.industry;
    if (params.owner) where.owner = params.owner;
    if (params.keyword) {
      where.OR = [
        { name: { contains: params.keyword, mode: 'insensitive' } },
        { email: { contains: params.keyword, mode: 'insensitive' } },
        { phone: { contains: params.keyword } },
      ];
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          ownerUser: {
            select: {
              id: true,
              username: true,
              realName: true,
              department: true,
            },
          },
          _count: {
            select: { contacts: true, projects: true, followups: true },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerSummary() {
    const [totalCustomers, activeCustomers, byType, byLevel] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.customer.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['level'],
        _count: true,
      }),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byLevel: byLevel.reduce((acc, item) => {
        acc[item.level] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        ownerUser: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        contacts: {
          orderBy: { createdAt: 'desc' },
        },
        projects: {
          select: {
            id: true,
            projectNo: true,
            name: true,
            status: true,
            budget: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        followups: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return customer;
  }

  async findContacts(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return this.prisma.contact.findMany({
      where: { customerId: id },
      orderBy: { isPrimary: 'desc', createdAt: 'desc' },
    });
  }

  async findProjects(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return this.prisma.project.findMany({
      where: { customerId: id },
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
    });
  }

  async findFollowups(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return this.prisma.customerFollowup.findMany({
      where: { customerId: id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 如果更新负责人，验证新负责人是否存在
    if (updateCustomerDto.owner) {
      const owner = await this.prisma.user.findUnique({
        where: { id: updateCustomerDto.owner },
      });

      if (!owner) {
        throw new NotFoundException('新负责人不存在');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
      include: {
        ownerUser: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
          },
        },
      },
    });
  }

  async transfer(id: string, newOwnerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    const newOwner = await this.prisma.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      throw new NotFoundException('新负责人不存在');
    }

    return this.prisma.customer.update({
      where: { id },
      data: { owner: newOwnerId },
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true, contracts: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 检查是否有关联的项目或合同
    if (customer._count.projects > 0) {
      throw new BadRequestException('客户有关联的项目，无法删除');
    }

    if (customer._count.contracts > 0) {
      throw new BadRequestException('客户有关联的合同，无法删除');
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: '客户删除成功' };
  }

  private async generateCustomerNo(): Promise<string> {
    const prefix = 'CUST';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 查找当月客户数量
    const count = await this.prisma.customer.count({
      where: {
        customerNo: {
          startsWith: `${prefix}${dateStr}`,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${dateStr}${sequence}`;
  }
}
