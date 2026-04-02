import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: '获取文档列表' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.documentsService.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      category,
      keyword,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文档详情' })
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载文档' })
  async download(@Param('id') id: string) {
    return this.documentsService.download(id);
  }

  @Post()
  @ApiOperation({ summary: '上传文档' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /(pdf|doc|docx|ppt|pptx|xls|xlsx)$/i }),
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('category') category?: string,
    @Body('tags') tags?: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.documentsService.upload({
      file,
      title,
      description,
      category,
      tags: tags ? JSON.parse(tags) : [],
      uploadedBy,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文档' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.documentsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
