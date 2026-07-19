import {
  IsIn,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateBotInput, UpdateBotInput } from '@botdock/contracts';

class BotModelConfigDto {
  @IsOptional()
  @IsString()
  providerCredentialId!: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  temperature!: number;

  @IsIn(['brief', 'balanced', 'detailed'])
  responseLength!: 'brief' | 'balanced' | 'detailed';

  @IsIn(['hybrid', 'semantic', 'keyword'])
  retrievalMode!: 'hybrid' | 'semantic' | 'keyword';

  @IsInt()
  @Min(1)
  @Max(12)
  maxSources!: number;

  @IsIn(['inline_source_chips', 'footer_source_list', 'hidden'])
  citationStyle!: 'inline_source_chips' | 'footer_source_list' | 'hidden';
}

class BotBehaviorConfigDto {
  @IsString()
  @MaxLength(3)
  initials!: string;

  @IsString()
  @MaxLength(1000)
  welcomeMessage!: string;

  @IsString()
  @MaxLength(8000)
  instructions!: string;

  @IsString()
  @MaxLength(120)
  tone!: string;

  @IsString()
  @MaxLength(160)
  handoffBehavior!: string;

  @IsString()
  @MaxLength(120)
  widgetTheme!: string;

  @IsString()
  @MaxLength(80)
  widgetPosition!: string;

  @IsBoolean()
  strictKnowledge!: boolean;

  @IsBoolean()
  promptInjectionProtection!: boolean;

  @IsBoolean()
  piiRedaction!: boolean;

  @IsBoolean()
  collectFeedback!: boolean;

  @IsBoolean()
  humanHandoff!: boolean;
}

export class CreateBotDto implements CreateBotInput {
  @IsString()
  @MinLength(1)
  organisationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BotModelConfigDto)
  modelConfig?: BotModelConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BotBehaviorConfigDto)
  behaviorConfig?: BotBehaviorConfigDto;
}

export class UpdateBotDto implements UpdateBotInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BotModelConfigDto)
  modelConfig?: BotModelConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BotBehaviorConfigDto)
  behaviorConfig?: BotBehaviorConfigDto;
}
