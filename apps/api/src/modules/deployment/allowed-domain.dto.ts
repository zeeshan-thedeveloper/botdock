import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PATTERN_REGEX =
  /^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$|^localhost$|^127\.0\.0\.1$|^null$/i;

export class CreateAllowedDomainDto {
  @IsString()
  @MinLength(1)
  @MaxLength(253)
  @Matches(PATTERN_REGEX, {
    message:
      'Enter a domain (example.com), a wildcard subdomain (*.example.com), localhost, 127.0.0.1, or null.',
  })
  pattern!: string;
}
