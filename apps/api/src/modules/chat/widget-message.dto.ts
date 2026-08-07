import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class WidgetMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  visitorId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message!: string;
}
