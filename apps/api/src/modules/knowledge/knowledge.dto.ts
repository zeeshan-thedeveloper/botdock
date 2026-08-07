import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { KnowledgeSourceType } from '@botdock/contracts';

export class CreateKnowledgeSourceDto {
  @IsIn(['file', 'text', 'faq'])
  type!: KnowledgeSourceType;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  content?: string;
}
