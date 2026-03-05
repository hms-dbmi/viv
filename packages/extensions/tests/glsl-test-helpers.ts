import { parse } from '@shaderfrog/glsl-parser';

const GLSL_PARSE_OPTIONS = { quiet: true };

/**
 * Wrap a GLSL snippet (uniform block, function defs) into a minimal
 * valid GLSL 300 es program so `@shaderfrog/glsl-parser` can parse it.
 */
export function wrapSnippet(snippet: string): string {
  return `#version 300 es
precision highp float;
precision highp int;
${snippet}
void main() {}
`;
}

/**
 * Parse GLSL and throw on syntax error. Returns the AST on success.
 */
export function assertValidGLSL(source: string, label?: string) {
  try {
    return parse(source, GLSL_PARSE_OPTIONS);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const msg = label ? `GLSL parse failed (${label})` : 'GLSL parse failed';
    throw new Error(`${msg}: ${message}\n---source---\n${source}`);
  }
}

