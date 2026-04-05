import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    status?: string;
    keyword?: string;
  }) {
    const { page, pageSize, status, keyword } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { contractNo: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
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
          tender: {
            select: {
              id: true,
              tenderNo: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contract.count({ where }),
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
    const contract = await this.prisma.contract.findUnique({
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
        tender: {
          select: {
            id: true,
            tenderNo: true,
            name: true,
            bidPrice: true,
            submissionDate: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('合同不存在');
    }

    return contract;
  }

  async create(createDto: any) {
    const contract = await this.prisma.contract.create({
      data: {
        ...createDto,
        project: {
          connect: { id: createDto.projectId },
        },
        ...(createDto.tenderId && {
          tender: {
            connect: { id: createDto.tenderId },
          },
        }),
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

    return contract;
  }

  async update(id: string, updateDto: any) {
    const contract = await this.prisma.contract.update({
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
        tender: {
          select: {
            id: true,
            tenderNo: true,
            name: true,
          },
        },
      },
    });

    return contract;
  }

  async approve(id: string, approvedBy: string) {
    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            customerName: true,
          },
        },
        tender: {
          select: {
            id: true,
            tenderNo: true,
            name: true,
          },
        },
      },
    });

    return contract;
  }

  async remove(id: string) {
    await this.prisma.contract.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
