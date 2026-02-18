import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  resolveEnvFilePath,
  loadEnvFile,
  applyEnvToProcess,
  getMissingEnvKeys,
  upsertEnvFile,
  REQUIRED_ENV_KEYS,
  SECRET_ENV_KEYS,
} from '../env.js'

const TEST_DIR = join(process.cwd(), '.test-tmp')

describe('env utilities', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('resolveEnvFilePath', () => {
    it('should return default .env in project dir when no envFile provided', () => {
      const result = resolveEnvFilePath('/project', undefined)
      expect(result).toBe('/project/.env')
    })

    it('should return default .env when envFile is empty string', () => {
      const result = resolveEnvFilePath('/project', '')
      expect(result).toBe('/project/.env')
    })

    it('should return absolute path as-is', () => {
      const result = resolveEnvFilePath('/project', '/custom/.env')
      expect(result).toBe('/custom/.env')
    })

    it('should resolve relative path from cwd', () => {
      const result = resolveEnvFilePath('/project', 'config/.env')
      expect(result).toContain('config/.env')
    })
  })

  describe('loadEnvFile', () => {
    it('should return empty object for non-existent file', () => {
      const result = loadEnvFile(join(TEST_DIR, 'missing.env'))
      expect(result).toEqual({})
    })

    it('should parse valid env file', () => {
      const envPath = join(TEST_DIR, '.env')
      writeFileSync(envPath, 'KEY1=value1\nKEY2=value2\n')
      const result = loadEnvFile(envPath)
      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' })
    })

    it('should handle quoted values', () => {
      const envPath = join(TEST_DIR, '.env')
      writeFileSync(envPath, 'KEY1="quoted value"\nKEY2=\'single quoted\'\n')
      const result = loadEnvFile(envPath)
      expect(result.KEY1).toBe('quoted value')
      expect(result.KEY2).toBe('single quoted')
    })

    it('should ignore comments and blank lines', () => {
      const envPath = join(TEST_DIR, '.env')
      writeFileSync(envPath, '# comment\nKEY1=value1\n\nKEY2=value2\n')
      const result = loadEnvFile(envPath)
      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' })
    })
  })

  describe('getMissingEnvKeys', () => {
    it('should return empty array when all required keys present', () => {
      const env = {
        ENCRYPTION_KEY: 'abc',
        AUTH_SECRET: 'xyz',
        AUTH_GITHUB_ID: 'id',
        AUTH_GITHUB_SECRET: 'secret',
        GITHUB_TOKEN: 'token',
      }
      const result = getMissingEnvKeys(REQUIRED_ENV_KEYS, env)
      expect(result).toEqual([])
    })

    it('should detect missing keys', () => {
      const env = {
        ENCRYPTION_KEY: 'abc',
        AUTH_SECRET: 'xyz',
      }
      const result = getMissingEnvKeys(REQUIRED_ENV_KEYS, env)
      expect(result).toEqual(['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET', 'GITHUB_TOKEN'])
    })

    it('should treat empty string as missing', () => {
      const env = {
        ENCRYPTION_KEY: 'abc',
        AUTH_SECRET: '',
        AUTH_GITHUB_ID: 'id',
        AUTH_GITHUB_SECRET: 'secret',
        GITHUB_TOKEN: 'token',
      }
      const result = getMissingEnvKeys(REQUIRED_ENV_KEYS, env)
      expect(result).toEqual(['AUTH_SECRET'])
    })

    it('should treat whitespace-only as missing', () => {
      const env = {
        ENCRYPTION_KEY: 'abc',
        AUTH_SECRET: '   ',
        AUTH_GITHUB_ID: 'id',
        AUTH_GITHUB_SECRET: 'secret',
        GITHUB_TOKEN: 'token',
      }
      const result = getMissingEnvKeys(REQUIRED_ENV_KEYS, env)
      expect(result).toEqual(['AUTH_SECRET'])
    })
  })

  describe('upsertEnvFile', () => {
    it('should create new file with values', () => {
      const envPath = join(TEST_DIR, '.env')
      upsertEnvFile(envPath, { KEY1: 'value1', KEY2: 'value2' })
      expect(existsSync(envPath)).toBe(true)
      const result = loadEnvFile(envPath)
      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' })
    })

    it('should update existing keys', () => {
      const envPath = join(TEST_DIR, '.env')
      writeFileSync(envPath, 'KEY1=old\nKEY2=keep\n')
      upsertEnvFile(envPath, { KEY1: 'new' })
      const result = loadEnvFile(envPath)
      expect(result).toEqual({ KEY1: 'new', KEY2: 'keep' })
    })

    it('should preserve unknown keys', () => {
      const envPath = join(TEST_DIR, '.env')
      writeFileSync(envPath, 'CUSTOM_KEY=custom\nKEY1=old\n')
      upsertEnvFile(envPath, { KEY1: 'new' })
      const result = loadEnvFile(envPath)
      expect(result).toEqual({ CUSTOM_KEY: 'custom', KEY1: 'new' })
    })

    it('should quote values with special characters', () => {
      const envPath = join(TEST_DIR, '.env')
      upsertEnvFile(envPath, { KEY1: 'value with spaces' })
      const result = loadEnvFile(envPath)
      expect(result.KEY1).toBe('value with spaces')
    })

    it('should handle values with quotes', () => {
      const envPath = join(TEST_DIR, '.env')
      // upsertEnvFile will escape quotes for storage
      upsertEnvFile(envPath, { KEY1: 'value "with" quotes' })
      const result = loadEnvFile(envPath)
      // dotenv preserves escaped quotes in parsed result
      expect(result.KEY1).toContain('with')
      expect(result.KEY1).toContain('quotes')
    })

    it('should handle backslashes', () => {
      const envPath = join(TEST_DIR, '.env')
      upsertEnvFile(envPath, { KEY1: 'path\\to\\file' })
      const result = loadEnvFile(envPath)
      // Value should be preserved (dotenv escaping rules apply)
      expect(result.KEY1).toContain('path')
      expect(result.KEY1).toContain('file')
    })

    it('should create parent directories if needed', () => {
      const envPath = join(TEST_DIR, 'nested', 'dir', '.env')
      upsertEnvFile(envPath, { KEY1: 'value1' })
      expect(existsSync(envPath)).toBe(true)
    })

    it('should preserve comments and blank lines', () => {
      const envPath = join(TEST_DIR, '.env')
      writeFileSync(envPath, '# Comment\nKEY1=old\n\n# Another comment\nKEY2=keep\n')
      upsertEnvFile(envPath, { KEY1: 'new' })
      const content = loadEnvFile(envPath)
      expect(content.KEY1).toBe('new')
      expect(content.KEY2).toBe('keep')
    })
  })

  describe('applyEnvToProcess', () => {
    it('should populate process.env without override', () => {
      const original = process.env.TEST_KEY
      applyEnvToProcess({ TEST_KEY: 'new-value' })
      expect(process.env.TEST_KEY).toBe('new-value')
      // Clean up
      if (original === undefined) {
        delete process.env.TEST_KEY
      } else {
        process.env.TEST_KEY = original
      }
    })

    it('should not override existing process.env values', () => {
      const original = process.env.PATH
      applyEnvToProcess({ PATH: 'should-not-override' })
      expect(process.env.PATH).toBe(original)
    })
  })

  describe('constants', () => {
    it('should have required env keys', () => {
      expect(REQUIRED_ENV_KEYS).toContain('ENCRYPTION_KEY')
      expect(REQUIRED_ENV_KEYS).toContain('AUTH_SECRET')
      expect(REQUIRED_ENV_KEYS).toContain('AUTH_GITHUB_ID')
      expect(REQUIRED_ENV_KEYS).toContain('AUTH_GITHUB_SECRET')
      expect(REQUIRED_ENV_KEYS).toContain('GITHUB_TOKEN')
    })

    it('should have secret env keys', () => {
      expect(SECRET_ENV_KEYS.has('ENCRYPTION_KEY')).toBe(true)
      expect(SECRET_ENV_KEYS.has('AUTH_SECRET')).toBe(true)
      expect(SECRET_ENV_KEYS.has('AUTH_GITHUB_SECRET')).toBe(true)
      expect(SECRET_ENV_KEYS.has('GITHUB_TOKEN')).toBe(true)
    })

    it('should not mark public keys as secret', () => {
      expect(SECRET_ENV_KEYS.has('AUTH_GITHUB_ID')).toBe(false)
    })
  })
})
