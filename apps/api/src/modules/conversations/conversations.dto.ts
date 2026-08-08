import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const CONVERSATION_SOURCES = ['PLAYGROUND', 'WIDGET', 'API'] as const;
const MESSAGE_FEEDBACK_VALUES = ['up', 'down'] as const;

export class SetMessageFeedbackDto {
  @ValidateIf((dto) => dto.feedback !== null)
  @IsIn(MESSAGE_FEEDBACK_VALUES)
  feedback!: (typeof MESSAGE_FEEDBACK_VALUES)[number] | null;
}

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
