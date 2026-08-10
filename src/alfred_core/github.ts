import { Language, UiAction, GitHubRepoAnalysis } from '../types';

export interface GitHubAnalysisPlan {
  shouldAnalyze: boolean;
  analysis: GitHubRepoAnalysis | null;
  textPrefix: string;
  uiActions: UiAction[];
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function extractGitHubRepo(message: string): { owner: string; repo: string; url: string } | null {
  const direct = message.match(/https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[\/#?].*)?/i);
  if (direct) {
    return { owner: direct[1], repo: direct[2].replace(/\.git$/i, ''), url: `https://github.com/${direct[1]}/${direct[2].replace(/\.git$/i, '')}` };
  }
  const shorthand = message.match(/\bgithub\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?\b/i);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/i, ''), url: `https://github.com/${shorthand[1]}/${shorthand[2].replace(/\.git$/i, '')}` };
  }
  return null;
}

function wantsAnalysis(message: string): boolean {
  const q = normalize(message);
  return /\b(github|repo|repositorio|analiza|analizar|revisa|review|inspecciona|inspect|audita|edi[tc]a|modifica|clone|clona)\b/.test(q);
}

function buildUiActions(url: string): UiAction[] {
  return [
    { type: 'open_url', label: 'Abrir repositorio GitHub', url, target: 'external', message: url },
    { type: 'open_url', label: 'Abrir README del repositorio', url: `${url}/blob/HEAD/README.md`, target: 'external', message: `${url}/blob/HEAD/README.md` },
    { type: 'toast', label: 'Análisis GitHub preparado', message: 'Alfred abrió la información pública del repositorio y preparó un resumen operativo.' },
  ];
}

export async function buildGitHubAnalysisPlan(message: string, language: Language): Promise<GitHubAnalysisPlan | null> {
  if (!wantsAnalysis(message)) return null;
  const repo = extractGitHubRepo(message);
  if (!repo) return null;

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
      headers: { 'user-agent': 'ALFRED/1.0' },
    });
    if (!repoRes.ok) throw new Error(`GitHub repo API ${repoRes.status}`);
    const repoData = await repoRes.json() as any;

    let readme: string | undefined;
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/readme`, {
        headers: { 'user-agent': 'ALFRED/1.0' },
      });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json() as any;
        if (readmeData?.content) {
          readme = Buffer.from(String(readmeData.content).replace(/\n/g, ''), 'base64').toString('utf8').slice(0, 2500);
        }
      }
    } catch {}

    let fileTree: Array<{ path: string; type: string }> | undefined;
    try {
      const branch = repoData.default_branch || 'HEAD';
      const treeRes = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${branch}?recursive=1`, {
        headers: { 'user-agent': 'ALFRED/1.0' },
      });
      if (treeRes.ok) {
        const treeData = await treeRes.json() as any;
        fileTree = Array.isArray(treeData?.tree)
          ? treeData.tree.slice(0, 40).map((entry: any) => ({ path: String(entry.path), type: String(entry.type) }))
          : undefined;
      }
    } catch {}

    const analysis: GitHubRepoAnalysis = {
      repositoryUrl: repo.url,
      owner: repo.owner,
      name: repo.repo,
      defaultBranch: repoData.default_branch,
      description: repoData.description || undefined,
      stars: typeof repoData.stargazers_count === 'number' ? repoData.stargazers_count : undefined,
      forks: typeof repoData.forks_count === 'number' ? repoData.forks_count : undefined,
      openIssues: typeof repoData.open_issues_count === 'number' ? repoData.open_issues_count : undefined,
      language: repoData.language || undefined,
      readme,
      fileTree,
      cloneUrl: repoData.clone_url || undefined,
      htmlUrl: repoData.html_url || repo.url,
    };

    const mode = normalize(message).match(/\b(edi[tc]a|modifica|modify|edit)\b/) ? 'edit' : 'analysis';
    const textPrefix = language === 'es'
      ? (mode === 'edit'
        ? `Jefe Maestro, detecté el repositorio ${repo.owner}/${repo.repo} y preparé un análisis público. Si quiere editarlo, necesito que me indique si está clonado localmente o cuál es el directorio de trabajo; sobre un enlace público solo puedo inspeccionarlo y preparar el plan.\n\n`
        : `Jefe Maestro, detecté el repositorio ${repo.owner}/${repo.repo} y preparé un análisis público. Si lo desea, también puedo convertirlo en un plan de edición una vez esté clonado localmente.\n\n`)
      : (mode === 'edit'
        ? `Jefe Maestro, I detected repository ${repo.owner}/${repo.repo} and prepared a public analysis. If you want me to edit it, I need the local checkout path or working directory; with a public link I can inspect and prepare the plan.\n\n`
        : `Jefe Maestro, I detected repository ${repo.owner}/${repo.repo} and prepared a public analysis. If you want, I can turn it into an edit plan once it is cloned locally.\n\n`);

    return {
      shouldAnalyze: true,
      analysis,
      textPrefix,
      uiActions: buildUiActions(repo.url),
    };
  } catch (error) {
    const textPrefix = language === 'es'
      ? `Jefe Maestro, no pude leer el repositorio de GitHub de forma pública (${repo.owner}/${repo.repo}). Puedo intentar de nuevo con otro enlace o con una copia local.\n\n`
      : `Jefe Maestro, I couldn't read the GitHub repository publicly (${repo.owner}/${repo.repo}). I can try again with another link or with a local clone.\n\n`;
    return {
      shouldAnalyze: true,
      analysis: null,
      textPrefix,
      uiActions: [
        { type: 'open_url', label: 'Abrir repositorio GitHub', url: repo.url, target: 'external', message: repo.url },
      ],
    };
  }
}
