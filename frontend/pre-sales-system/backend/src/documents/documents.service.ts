import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    category?: string;
    keyword?: string;
  }) {
    const { page, pageSize, category, keyword } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { fileName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
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
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    return document;
  }

  async download(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 增加下载次数
    await this.prisma.document.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });

    const filePath = join(process.cwd(), 'uploads', document.fileName);
    
    try {
      const file = await fs.readFile(filePath);
      return {
        file,
        fileName: document.fileName,
        fileType: document.fileType,
      };
    } catch (error) {
      throw new NotFoundException('文件不存在');
    }
  }

  async upload(params: {
    file: Express.Multer.File;
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    uploadedBy: string;
  }) {
    const { file, title, description, category, tags, uploadedBy } = params;

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${file.originalname}`;

    const document = await this.prisma.document.create({
      data: {
        title,
        fileName,
        fileUrl: `/uploads/${fileName}`,
        fileSize: file.size,
        fileType: fileExtension || 'unknown',
        description,
        category: category || 'OTHER',
        tags: tags || [],
        uploadedBy,
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    return document;
  }

  async update(id: string, updateDto: any) {
    const document = await this.prisma.document.update({
      where: { id },
      data: updateDto,
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    return document;
  }

  async remove(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 删除物理文件
    try {
      const filePath = join(process.cwd(), 'uploads', document.fileName);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('删除文件失败:', error);
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
