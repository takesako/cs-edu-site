export type CourseKey = 'kotoba' | 'tsukuru' | 'moyou' | 'katachi' | 'keisan' | 'kata';

export interface CourseInfo {
  key: CourseKey;
  no: number;
  title: string;
  tagline: string;
  description: string;
  total: number;
  /** 前提コース */
  prerequisite?: CourseKey;
}

export const COURSES: CourseInfo[] = [
  {
    key: 'kotoba',
    no: 1,
    title: 'ことばとしてのプログラミング',
    tagline: '世界一誠実な読み手と、ことばを交わす',
    description:
      'プログラミングの経験はいりません。コンピュータという「読み手」に、曖昧さのない文を書く技術——その出発点から、JavaScriptで小さな作品を作るところまで歩きます。',
    total: 10,
  },
  {
    key: 'tsukuru',
    no: 2,
    title: 'じぶんの言語をつくる',
    tagline: '言語は、与えられるものではなく設計するもの',
    description:
      '電卓から始めて、変数、分岐、関数、そして自分だけの文法へ。コース1で使った「にわ語」の正体を、作る側から解き明かします。',
    total: 12,
    prerequisite: 'kotoba',
  },
  {
    key: 'moyou',
    no: 3,
    title: 'もようをさがすことば — 正規表現',
    tagline: '数文字で書ける、いちばん小さな言語',
    description:
      '電話番号、日付、メールアドレス。文字の並びにひそむ「もよう」を言い当てる小さな言語が、正規表現です。検索窓の裏で動く機械を、自分の目でのぞきます。',
    total: 8,
    prerequisite: 'kotoba',
  },
  {
    key: 'katachi',
    no: 4,
    title: 'アルゴリズムのかたち',
    tagline: '同じ問題にも、速い手順と遅い手順がある',
    description:
      'さがす、ならべる、おぼえておく。手順の「かたち」が変わると、同じ仕事が千倍速くなることがあります。回数を数えながら、その理由を体で確かめます。',
    total: 8,
    prerequisite: 'kotoba',
  },
  {
    key: 'keisan',
    no: 5,
    title: '計算できる、とはどういうことか',
    tagline: '紙とえんぴつの機械が、計算の限界を教えてくれる',
    description:
      'コンピュータにできること・できないことの境界線は、100年近く前に紙の上で引かれていました。チューリング機械を自分の手で動かして、その線まで歩きます。',
    total: 8,
    prerequisite: 'tsukuru',
  },
  {
    key: 'kata',
    no: 6,
    title: '型のはなし — まちがいを、起きる前に',
    tagline: '実行せずにプログラムを読む、もうひとりの読み手',
    description:
      '誤りには、動かして初めて分かるものと、動かす前に分かるものがあります。コース2で作った言語に「型」という目を足して、後者を捕まえる仕組みを作ります。',
    total: 8,
    prerequisite: 'tsukuru',
  },
];

export function courseByKey(key: string): CourseInfo | undefined {
  return COURSES.find((c) => c.key === key);
}
