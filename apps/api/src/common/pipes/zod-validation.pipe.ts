import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ZodSchema, ZodError } from '@vocabulary/validation';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Never validate custom parameter decorators (like @CurrentUserId)
    if (metadata.type === 'custom') {
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => {
          const fieldName = issue.path.length > 0 ? issue.path.join('.') : undefined;
          return {
            field: fieldName,
            message: issue.message,
            code: issue.code,
          };
        });

        // Generate a clear, human-readable summary for user-facing UI
        const summary = issues
          .map((i) => (i.field ? `${i.field}: ${i.message}` : i.message))
          .join('. ');

        throw new BadRequestException({
          message: summary,
          issues,
        });
      }
      throw new BadRequestException('Validation failed. Please check your input.');
    }
  }
}
