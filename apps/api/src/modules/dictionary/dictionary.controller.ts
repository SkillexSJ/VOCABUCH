import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { lookupWordSchema } from '@vocabulary/validation';
import type { LookupWordInput } from '@vocabulary/validation';

@Controller('dictionary')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get('lookup')
  async lookup(
    @Query(new ZodValidationPipe(lookupWordSchema)) query: LookupWordInput,
  ) {
    const entry = await this.dictionaryService.lookup({
      word: query.word,
      sourceLanguage: query.language,
      targetLanguage: query.targetLanguage,
      contextSentence: query.contextSentence,
    });

    if (!entry) {
      throw new NotFoundException(
        `Definition or translation for "${query.word}" not found`,
      );
    }

    return entry;
  }
}
