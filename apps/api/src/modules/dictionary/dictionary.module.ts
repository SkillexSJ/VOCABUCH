import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DictionaryController } from './dictionary.controller';
import { DictionaryService } from './dictionary.service';
import { FreeDictionaryAdapter } from './adapters/free-dictionary.adapter';
import { TranslationMemoryAdapter } from './adapters/translation-memory.adapter';
import { AiRagAdapter } from './adapters/ai-rag.adapter';
import { WiktionaryGermanAdapter } from './adapters/wiktionary-german.adapter';
import { DictionaryPipeline } from './dictionary.pipeline';
import {
  DICTIONARY_ADAPTER,
  DICTIONARY_PIPELINE,
} from './adapters/dictionary.adapter.interface';

@Module({
  imports: [ConfigModule],
  controllers: [DictionaryController],
  providers: [
    AiRagAdapter,
    TranslationMemoryAdapter,
    FreeDictionaryAdapter,
    WiktionaryGermanAdapter,
    DictionaryPipeline,
    DictionaryService,
    {
      provide: DICTIONARY_PIPELINE,
      useExisting: DictionaryPipeline,
    },
    {
      provide: DICTIONARY_ADAPTER,
      useExisting: DictionaryPipeline,
    },
  ],
  exports: [DictionaryService],
})
export class DictionaryModule {}
