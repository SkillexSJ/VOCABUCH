import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createVocabularySchema,
  updateVocabularySchema,
  queryVocabularySchema,
} from '@vocabulary/validation';
import type {
  CreateVocabularyInput,
  UpdateVocabularyInput,
  QueryVocabularyInput,
} from '@vocabulary/validation';
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createVocabularySchema)) dto: CreateVocabularyInput,
  ) {
    return this.vocabularyService.create(userId, dto);
  }

  @Post('bulk')
  async bulkCreate(
    @CurrentUserId() userId: string,
    @Body('items') items: CreateVocabularyInput[],
  ) {
    return this.vocabularyService.bulkCreate(userId, items || []);
  }

  @Get()
  async findAll(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(queryVocabularySchema))
    query: QueryVocabularyInput,
  ) {
    return this.vocabularyService.findAll(userId, query);
  }

  @Get('check')
  async check(
    @CurrentUserId() userId: string,
    @Query('word') word: string,
    @Query('sourceLanguage') sourceLanguage?: string,
  ) {
    return this.vocabularyService.checkDuplicate(
      userId,
      word || '',
      sourceLanguage || 'de',
    );
  }

  @Get(':id')
  async findOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.vocabularyService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVocabularySchema))
    dto: UpdateVocabularyInput,
  ) {
    return this.vocabularyService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    await this.vocabularyService.remove(userId, id);
  }
}
