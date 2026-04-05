import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TendersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
  }) {
    const { page, pageSize, status, type } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.tenderType = type;
    }

    const [data, total] = await Promise.all([
      this.prisma.tender.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              customerName: true,
            },
          },
          contracts: {
            select: {
              id: true,
              contractNo: true,
              contractValue: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tender.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const tender = await this.prisma.tender.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            customerName: true,
            description: true,
            budget: true,
          },
        },
        contracts: {
          include: {
            project: {
              select: {
                name: true,
                customerName: true,
              },
            },
          },
        },
      },
    });

    if (!tender) {
      throw new NotFoundException('投标不存在');
    }

    return tender;
  }

  async create(createDto: any) {
    const tender = await this.prisma.tender.create({
      data: {
        ...createDto,
        project: {
          connect: { id: createDto.projectId },
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            customerName: true,
          },
        },
      },
    });

    return tender;
  }

  async update(id: string, updateDto: any) {
    const tender = await this.prisma.tender.update({
      where: { id },
      data: updateDto,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            customerName: true,
          },
        },
        contracts: {
          select: {
            id: true,
            contractNo: true,
            contractValue: true,
          },
        },
      },
    });

    return tender;
  }

  async updateStatus(id: string, status: string) {
    const tender = await this.prisma.tender.update({
      where: { id },
      data: { status },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            customerName: true,
          },
        },
      },
    });

    return tender;
  }

  async remove(id: string) {
    await this.prisma.tender.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
