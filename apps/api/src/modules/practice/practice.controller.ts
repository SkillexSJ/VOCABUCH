import { Controller, Get, Post, Body, Query, UsePipes } from '@nestjs/common';
import { PracticeService } from './practice.service';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  submitExerciseSchema,
  practiceQueueQuerySchema,
} from '@vocabulary/validation';
import type {
  PracticeQueueQueryInput,
  SubmitExerciseInput,
} from '@vocabulary/validation';
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('queue')
  async getQueue(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(practiceQueueQuerySchema))
    query: PracticeQueueQueryInput,
  ) {
    return this.practiceService.getPracticeQueue(userId, query);
  }

  @Post('attempt')
  async submitAttempt(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(submitExerciseSchema)) dto: SubmitExerciseInput,
  ) {
    return this.practiceService.recordAttempt(userId, dto);
  }

  @Get('stats')
  async getStats(
    @CurrentUserId() userId: string,
    @Query('sourceLanguage') sourceLanguage?: string,
    @Query('targetLanguage') targetLanguage?: string,
  ) {
    return this.practiceService.getStats(
      userId,
      sourceLanguage,
      targetLanguage,
    );
  }
}
