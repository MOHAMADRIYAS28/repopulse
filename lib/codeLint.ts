import { Linter } from "eslint";
import * as ts from "typescript";
import * as csstree from "css-tree";

export type LintIssue = {
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
  ruleId: string | null;
};

export type LintResult = {
  fileName: string;
  language: string;
  issues: LintIssue[];
  errorCount: number;
  warningCount: number;
  isClean: boolean;
  checkType: "full" | "structural";
};

function detectLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    go: "go",
    rb: "ruby",
    php: "php",
  };
  return map[ext] || "unknown";
}

function lintJavaScript(content: string, jsx: boolean): LintIssue[] {
  const linter = new Linter({ configType: "eslintrc" });
  const messages = linter.verify(content, {
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      ecmaFeatures: { jsx },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
      "no-const-assign": "error",
      "no-redeclare": "error",
      "no-fallthrough": "warn",
      "no-extra-semi": "warn",
      "no-irregular-whitespace": "warn",
      "valid-typeof": "error",
      "use-isnan": "error",
      "no-dupe-else-if": "error",
      "no-case-declarations": "warn",
    },
    env: { es2021: true, browser: true, node: true },
  });

  return messages.map((m) => ({
    line: m.line,
    column: m.column,
    severity: m.severity === 2 ? "error" : "warning",
    message: m.message,
    ruleId: m.ruleId,
  }));
}

function lintTypeScript(content: string, fileName: string, jsx: boolean): LintIssue[] {
  const scriptKind = jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (name) => name === fileName,
    readFile: (name) => (name === fileName ? content : undefined),
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => "lib.d.ts",
  };

  const program = ts.createProgram(
    [fileName],
    { noEmit: true, allowJs: true, jsx: jsx ? ts.JsxEmit.React : undefined, skipLibCheck: true, noResolve: true },
    host
  );

  const diagnostics = [...program.getSyntacticDiagnostics(sourceFile)];

  return diagnostics.map((d) => {
    const pos = d.file && d.start !== undefined
      ? d.file.getLineAndCharacterOfPosition(d.start)
      : { line: 0, character: 0 };
    return {
      line: pos.line + 1,
      column: pos.character + 1,
      severity: "error" as const,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
      ruleId: `TS${d.code}`,
    };
  });
}

function lintJSON(content: string): LintIssue[] {
  try {
    JSON.parse(content);
    return [];
  } catch (e: any) {
    const match = /position (\d+)/.exec(e.message);
    let line = 1;
    if (match) {
      const pos = parseInt(match[1], 10);
      line = content.slice(0, pos).split("\n").length;
    }
    return [
      {
        line,
        column: 1,
        severity: "error",
        message: e.message,
        ruleId: "json-parse-error",
      },
    ];
  }
}

function lintCSS(content: string): LintIssue[] {
  try {
    csstree.parse(content, { onParseError: (error: any) => { throw error; } });
    return [];
  } catch (e: any) {
    return [
      {
        line: e.line || 1,
        column: e.column || 1,
        severity: "error",
        message: e.rawMessage || e.message || "CSS syntax error",
        ruleId: "css-parse-error",
      },
    ];
  }
}

// Generic structural check for languages we don't have a real parser for.
// Catches unbalanced brackets/parens/quotes — common copy-paste/upload mistakes.
function structuralCheck(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const stack: { char: string; line: number; col: number }[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const openers = new Set(["(", "[", "{"]);

  let line = 1;
  let col = 0;
  let inString: string | null = null;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    col++;
    if (char === "\n") {
      line++;
      col = 0;
      continue;
    }

    if (inString) {
      if (char === inString && content[i - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (openers.has(char)) {
      stack.push({ char, line, col });
    } else if (char in pairs) {
      const last = stack.pop();
      if (!last || last.char !== pairs[char]) {
        issues.push({
          line,
          column: col,
          severity: "error",
          message: `Unmatched '${char}' — no corresponding '${pairs[char]}' found`,
          ruleId: "structural-check",
        });
      }
    }
  }

  for (const unclosed of stack) {
    issues.push({
      line: unclosed.line,
      column: unclosed.col,
      severity: "error",
      message: `Unclosed '${unclosed.char}' — missing closing bracket`,
      ruleId: "structural-check",
    });
  }

  return issues;
}

export function lintCode(fileName: string, content: string): LintResult {
  const language = detectLanguage(fileName);
  let issues: LintIssue[] = [];
  let checkType: "full" | "structural" = "full";

  try {
    switch (language) {
      case "javascript":
        issues = lintJavaScript(content, false);
        break;
      case "jsx":
        issues = lintJavaScript(content, true);
        break;
      case "typescript":
        issues = lintTypeScript(content, fileName, false);
        break;
      case "tsx":
        issues = lintTypeScript(content, fileName, true);
        break;
      case "json":
        issues = lintJSON(content);
        break;
      case "css":
      case "scss":
        issues = lintCSS(content);
        break;
      default:
        // HTML, Python, Java, C, C++, Go, Ruby, PHP, and anything unrecognized
        issues = structuralCheck(content);
        checkType = "structural";
    }
  } catch (err) {
    // If a real parser throws unexpectedly, fall back to structural check
    issues = structuralCheck(content);
    checkType = "structural";
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    fileName,
    language,
    issues,
    errorCount,
    warningCount,
    isClean: issues.length === 0,
    checkType,
  };
}