#!/usr/bin/env python3
"""C6 codemod — migrate screens from static `t` import to useTheme().

Mechanical transformations per file:
1. Font literals -> fonts.* tokens (400→regular, 500→medium, 600/700→bold).
2. Import line from '@/constants/theme': drop `t`/`statusFamily`, add
   `fonts` (if used) and `type ThemeColors` (if the sheet needs a factory).
3. Module-level `const s = StyleSheet.create({...})` that references `t`
   becomes `const makeStyles = (t: ThemeColors) => StyleSheet.create({...})`.
4. Every function component whose own body references t/statusFamily/s-keys
   gets `const { t, statusFamily } = useTheme()` + `const s = makeStyles(t)`.

tsc afterwards catches anything the detector missed (undefined t/s).
"""
import re
import sys

FONT_MAP = [
    ("'IBMPlexSansArabic_400Regular'", 'fonts.regular'),
    ("'IBMPlexSansArabic_500Medium'", 'fonts.medium'),
    ("'IBMPlexSansArabic_600SemiBold'", 'fonts.bold'),
    ("'IBMPlexSansArabic_700Bold'", 'fonts.bold'),
]

T_REF = re.compile(r'(?<![A-Za-z0-9_$])t\.')
SF_REF = re.compile(r'(?<![A-Za-z0-9_$])statusFamily(?![A-Za-z0-9_$])')
IMPORT_RE = re.compile(r"import \{([^}]*)\} from '@/constants/theme'\n")
FUNC_RE = re.compile(r'(?:export default )?function ([A-Z]\w*)\s*\(')


def find_matching(text, open_idx, open_ch='{', close_ch='}'):
    depth = 0
    i = open_idx
    while i < len(text):
        c = text[i]
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def component_extents(text):
    """[(name, open_idx, close_idx)] for every `function Uppercase(` decl."""
    out = []
    for m in FUNC_RE.finditer(text):
        i = m.end() - 1  # start ON the '(' so depth counts it
        depth = 0
        while i < len(text):
            if text[i] == '(':
                depth += 1
            elif text[i] == ')':
                depth -= 1
                if depth == 0:
                    break
            i += 1
        j = text.find('{', i)
        if j == -1:
            continue
        close = find_matching(text, j)
        if close == -1:
            continue
        out.append((m.group(1), j, close))
    return out


def own_body(text, j, close, extents):
    """Body text minus nested component extents (blanked out)."""
    body = list(text[j + 1:close])
    for (_n, cj, cc) in extents:
        if cj > j and cc < close:
            for k in range(cj, cc + 1):
                if k > j and k < close:
                    body[k - (j + 1)] = ' '
    return ''.join(body)


def migrate(path):
    src = open(path).read()
    orig = src

    # 1. font literals
    for lit, tok in FONT_MAP:
        src = src.replace(lit, tok)
    uses_fonts = 'fonts.' in src

    # 3. sheet factory (only the module-level `const s = StyleSheet.create`)
    sheet_header = 'const s = StyleSheet.create({'
    hidx = src.find(sheet_header)
    needs_factory = False
    sheet_keys = []
    if hidx != -1:
        # find opening brace of the object
        oidx = src.find('{', hidx + len(sheet_header) - 1)
        cidx = find_matching(src, oidx)
        sheet_body = src[oidx:cidx]
        needs_factory = bool(T_REF.search(sheet_body))
        if needs_factory:
            src = src.replace(
                sheet_header,
                'const makeStyles = (t: ThemeColors) => StyleSheet.create({',
                1,
            )
        # collect style keys for precise s.<key> detection
        for km in re.finditer(r'^\s{2}([a-zA-Z]\w*):', sheet_body, re.M):
            sheet_keys.append(km.group(1))
    s_ref = re.compile(r'(?<![A-Za-z0-9_$])s\.(' + '|'.join(map(re.escape, sheet_keys)) + r')(?![A-Za-z0-9_$])') if sheet_keys else None

    # 4. hook insertion per component (process from last to first to keep indices)
    extents = component_extents(src)
    inserts = []  # (pos, lines)
    for (name, j, close) in extents:
        body = own_body(src, j, close, extents)
        refs_sf = bool(SF_REF.search(body))
        refs_s = bool(s_ref and s_ref.search(body))
        refs_t = bool(T_REF.search(body)) or refs_s
        if not (refs_t or refs_sf or refs_s):
            continue
        destructure = []
        if refs_t:
            destructure.append('t')
        if refs_sf:
            destructure.append('statusFamily')
        lines = [f'const {{ {", ".join(destructure)} }} = useTheme()']
        if refs_s:
            lines.append('const s = makeStyles(t)')
        inserts.append((j + 1, lines))
    for pos, lines in sorted(inserts, key=lambda x: -x[0]):
        block = '\n  ' + '\n  '.join(lines)
        src = src[:pos] + block + '\n' + src[pos:]

    # 2. import rewrite
    m = IMPORT_RE.search(src)
    if m:
        names = [n.strip() for n in m.group(1).split(',') if n.strip()]
        keep = [n for n in names if n not in ('t', 'statusFamily')]
        if uses_fonts and 'fonts' not in keep:
            keep.append('fonts')
        if needs_factory and 'type ThemeColors' not in keep:
            keep.append('type ThemeColors')
        replacement = ''
        if keep:
            replacement = "import { " + ', '.join(keep) + " } from '@/constants/theme'\n"
        replacement += "import { useTheme } from '@/theme/ThemeProvider'\n"
        src = src[:m.start()] + replacement + src[m.end():]
    elif "from '@/theme/ThemeProvider'" not in src:
        # file references theme but has no constants import (shouldn't happen)
        print(f'  !! {path}: no constants/theme import found')

    if src != orig:
        open(path, 'w').write(src)
        return True
    return False


if __name__ == '__main__':
    for p in sys.argv[1:]:
        changed = migrate(p)
        print(('MIGRATED ' if changed else 'unchanged ') + p)
