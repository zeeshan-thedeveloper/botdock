import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PlaygroundMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message!: string;
}
