import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
  BadRequestException
} from '@nestjs/common'
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { resolve, extname, basename } from 'node:path'
import { diskStorage } from 'multer'
import type { Request } from 'express'
import { statSync, mkdirSync } from 'node:fs'
import process from 'node:process'

import { UploadService } from './upload.service'
import { CreateUploadDto } from './dto/create-upload.dto'
import { UpdateUploadDto } from './dto/update-upload.dto'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Upload API 模块')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: '上传单个图片文件' })
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination(req, file, callback) {
          const path = resolve(__dirname, `${process.cwd()}`, 'static/uploads/images')
          try {
            statSync(path)
            callback(null, path)
          } catch {
            mkdirSync(path, { recursive: true })
            callback(null, path)
          }
        },
        filename(req: Request, file: Express.Multer.File, callback) {
          // const filename = basename(
          //   file.originalname,
          //   extname(file.originalname),
          // );

          callback(null, `${new Date().getTime()}${extname(file.originalname)}`)
        }
      }),
      fileFilter(req, file, callback) {
        if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
          callback(null, true)
        } else {
          callback(new BadRequestException('仅支持上传图像!'), false)
        }
      },
      limits: {
        fileSize: 1024 * 1024 * 10, // 10MB,
        files: 1
      }
    })
  )
  uploadImageFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('请选择文件!')
    console.log('file', file)

    return this.uploadService.uploadImageFile(file)
  }

  @ApiOperation({ summary: '上传多个图片文件' })
  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      storage: diskStorage({
        destination(req, file, callback) {
          const path = resolve(__dirname, `${process.cwd()}`, 'static/uploads/images')
          try {
            statSync(path)
            callback(null, path)
          } catch {
            mkdirSync(path, { recursive: true })
            callback(null, path)
          }
        },
        filename(req: Request, file: Express.Multer.File, callback) {
          callback(null, `${new Date().getTime()}${extname(file.originalname)}`)
        }
      }),
      fileFilter(req, file, callback) {
        if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
          callback(null, true)
        } else {
          callback(new BadRequestException('仅支持上传图像!'), false)
        }
      },
      limits: {
        fileSize: 1024 * 1024 * 10, // 10MB,
        files: 9
      }
    })
  )
  uploadImageFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: Request
    // @Body() body: CreateUploadDto,
  ) {
    if (!files) throw new BadRequestException('请选择文件!')
    // if (!body.tags) throw new BadRequestException('请选择至少一个标签');

    return this.uploadService.uploadImageFiles(files)
  }

  @ApiOperation({ summary: '获取所有上传的图片文件' })
  @Get()
  findAll() {
    return this.uploadService.findAll()
  }

  @ApiOperation({ summary: '获取单个上传的图片文件' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.uploadService.findOne(+id)
  }

  @ApiOperation({ summary: '更新单个上传的图片文件' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUploadDto: UpdateUploadDto) {
    return this.uploadService.update(+id, updateUploadDto)
  }

  @ApiOperation({ summary: '删除单个上传的图片文件' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.uploadService.remove(+id)
  }
}
