import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(customerId: string, createContactDto: CreateContactDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 如果设置为主联系人，先取消其他主联系人
    if (createContactDto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.contact.create({
      data: {
        customerId,
        name: createContactDto.name,
        position: createContactDto.position,
        department: createContactDto.department,
        phone: createContactDto.phone,
        mobile: createContactDto.mobile,
        email: createContactDto.email,
        wechat: createContactDto.wechat,
        isPrimary: createContactDto.isPrimary || false,
        status: createContactDto.status || 'ACTIVE',
        notes: createContactDto.notes,
        decisionInfluence: createContactDto.decisionInfluence || 'MEDIUM',
      },
    });

    return contact;
  }

  async findAll(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return this.prisma.contact.findMany({
      where: { customerId },
      orderBy: { isPrimary: 'desc', createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            customerNo: true,
            name: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 如果设置为主联系人，先取消其他主联系人
    if (updateContactDto.isPrimary && !contact.isPrimary) {
      await this.prisma.contact.updateMany({
        where: {
          customerId: contact.customerId,
          id: { not: id },
        },
        data: { isPrimary: false },
      });
    }

    return this.prisma.contact.update({
      where: { id },
      data: updateContactDto,
    });
  }

  async setPrimary(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 取消其他主联系人
    await this.prisma.contact.updateMany({
      where: {
        customerId: contact.customerId,
        id: { not: id },
      },
      data: { isPrimary: false },
    });

    return this.prisma.contact.update({
      where: { id },
      data: { isPrimary: true },
    });
  }

  async remove(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    await this.prisma.contact.delete({
      where: { id },
    });

    return { message: '联系人删除成功' };
  }
}
