import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const CONVERSATION_SOURCES = ['PLAYGROUND', 'WIDGET', 'API'] as const;

export class ListConversationsQueryDto {
  @IsOptional()
  @IsString()
  botId?: string;

  @IsOptional()
  @IsIn(CONVERSATION_SOURCES)
  source?: (typeof CONVERSATION_SOURCES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
