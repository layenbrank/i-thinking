import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PostsService } from './posts.service'

@Controller('posts')
export class PostsController {
	constructor(private readonly postsService: PostsService) {}

	@Post()
	create(@Req() req: Request, @Body() createPostDto: CreatePostDto) {
		return this.postsService.create(req, createPostDto)
	}

	@Get()
	findAll(@Req() req: Request) {
		return this.postsService.findAll(req)
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.postsService.findOne(+id)
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
		return this.postsService.update(+id, updatePostDto)
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.postsService.remove(+id)
	}
}
