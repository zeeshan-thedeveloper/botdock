import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpsertProviderCredentialInput } from '@botdock/contracts';

export class UpsertProviderCredentialDto implements UpsertProviderCredentialInput {
  @IsIn(['openai'])
  provider!: 'openai';

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(1)
  apiKey!: string;
}
