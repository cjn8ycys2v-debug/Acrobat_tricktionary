import atlasData from "@/data/atlas-data.json";
import { deriveDiscipline, disciplineGuides, familyGuides, sortDisciplines, sortFamilies } from "@/lib/taxonomy";
import type { AtlasData, LevelTest, Source, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";

const data = atlasData as AtlasData;

export const sources: Source[] = data.sources;
export const levelTests: LevelTest[] = data.levels;

const difficultyByLevel = new Map<number, Trick["difficulty"]>([
  [1, 1],
  [2, 2],
  [3, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [7, 4],
  [8, 4],
  [9, 5],
  [10, 5]
]);

const riskByLevel = new Map<number, Trick["riskLevel"]>([
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [7, 4],
  [8, 4],
  [9, 5],
  [10, 5]
]);

const explicitTags: Record<string, string[]> = {
  "ロンダート": ["反発", "助走", "接続"],
  "バク転": ["後方", "反発", "補助推奨"],
  "ロン宙": ["後方宙返り", "助走", "高さ"],
  "バタフライツイスト": ["トリッキング", "ひねり", "水平軌道"],
  "コークスクリュー": ["トリッキング", "ひねり", "高難度"],
  "ウインドミル": ["ブレイキン", "床回転", "連続"],
  "1990": ["ブレイキン", "倒立回転", "高難度"],
  "2000": ["ブレイキン", "倒立回転", "高難度"]
};

const explicitAliases: Record<string, string[]> = {
  "側転": ["カートホイール", "cartwheel"],
  "ロンダート": ["ラウンドオフ", "roundoff", "round-off"],
  "バク転": ["バック転", "バックハンドスプリング", "back handspring"],
  "ハンドスプリング": ["前方転回", "front handspring"],
  "前宙": ["前方宙返り", "front flip"],
  "バク宙": ["バック宙", "後方宙返り", "back flip"],
  "ロン宙": ["ロンダート宙返り", "roundoff back tuck"],
  "エアリアル": ["aerial"],
  "バタフライツイスト": ["B-twist", "btwist"],
  "コークスクリュー": ["corkscrew", "cork"],
  "ウインドミル": ["windmill"],
  "トーマス": ["トーマスフレア", "flare"],
  "マカコ": ["macaco"],
  "ヘリコプテイロ": ["helicoptero"]
};

type TrickKnowledgeOverride = Partial<
  Pick<
    Trick,
    | "aliases"
    | "summary"
    | "description"
    | "originNote"
    | "practiceSteps"
    | "commonMistakes"
    | "safetyNotes"
    | "coachComment"
    | "knowledgeStatus"
    | "knowledgeSourceUrls"
    | "showKnowledgeSources"
    | "tags"
  >
>;

const knowledgeOverrides: Record<string, TrickKnowledgeOverride> = {
  "側転": {
    summary: "手で床を押しながら体を横に通す、側方系の入口技。縄内では移動方向と抜け方を作る基礎になります。",
    description:
      "側転は、両手を順に着きながら体を横回転で運ぶ基本技です。ダブルダッチでは単なる体操技ではなく、縄の中で横幅、手を着く位置、抜ける方向を覚えるための土台になります。ロンダート、片手側転、エアリアルへ進む前に、手を着く順番と着地足を毎回そろえられるようにします。",
    originNote:
      "体操では cartwheel と呼ばれる基礎的な側方回転です。ダブルダッチでは、技名そのものの由来よりも、縄内で横移動しながら手支持を入れるための共通言語として使われます。",
    practiceSteps: ["線の上で手足が一直線に通るか確認する", "着地足と胸の向きを毎回そろえる", "縄内では入る位置と抜ける位置を先に決める"],
    commonMistakes: ["手を近くに着きすぎて腰が通らない", "着地で胸が横を向きすぎて次の動きに入れない"],
    safetyNotes: ["手首と肩に痛みがある日は回数を減らす", "縄内では横幅を取りすぎない位置から入る"],
    coachComment: "ロンダートやエアリアルへ進む人ほど、側転の手の位置と着地の向きを丁寧にそろえると後が楽です。",
    tags: ["由来メモあり", "側方入口"],
    knowledgeStatus: "reviewing"
  },
  "ロンダート": {
    summary: "側転に半ひねりと反発を加え、次の宙返りやバク転へつなぐ接続技。",
    description:
      "ロンダートは側転に近い入りから両足着地へまとめ、床を押して次の技へ反発を残す技です。ダブルダッチでは助走距離を長く取れないことが多いため、手を着く位置、腰の通り道、着地で沈まないことが重要です。ロン宙、ロンバク、ロンバク宙の入口として相関図でも中心になります。",
    originNote:
      "英語では roundoff と呼ばれ、体操・タンブリングで宙返りの前に反発を作る代表的な接続技として整理されています。日本語のロンダートはこの roundoff 系の呼び名として使われます。",
    practiceSteps: ["側転の入りから胸を返して両足着地へまとめる", "着地で膝を沈めすぎず、床を押し返す感覚を作る", "次にバク転や宙返りを置く前提で抜け方向を固定する"],
    commonMistakes: ["手を着く角度が浅く、着地で横に流れる", "反発を作る前に膝が深く曲がってしまう"],
    safetyNotes: ["首や腰を反って無理に返さない", "ロン宙へ進む前に、単体の着地反発を補助者に確認してもらう"],
    coachComment: "見た目は側転に近いですが、目的は横に回ることではなく次の技へ力を残すことです。",
    tags: ["由来メモあり", "接続技", "反発"],
    knowledgeStatus: "reviewing"
  },
  "バク転": {
    summary: "後方へ手を着いて反発する、後方系アクロの大きな分岐点。",
    description:
      "バク転は後方へ跳び、手支持を経由して足で立ち戻る技です。ダブルダッチでは単発でも見せ場になりますが、ロンダート後の反発を受けてロンバク、バク転→バク宙へつなぐ役割が大きくなります。恐怖心が出やすい技なので、補助・マット・段階練習で手の着き方と肩の押しを作ります。",
    originNote:
      "英語では back handspring と呼ばれる体操・タンブリング由来の技です。名前の通り、後方へ跳びながら手で床を押して戻る動きとして考えると、バク宙との違いが整理しやすくなります。",
    practiceSteps: ["ブリッジや後方倒立で肩の可動域を確認する", "補助付きで手を遠くへ着く感覚を作る", "着地後に次の技へ進める姿勢で止まる"],
    commonMistakes: ["上へ跳べずに後ろへ倒れ込む", "手を近くに着いて肩が詰まる", "着地後に胸が落ちて次の技へ入れない"],
    safetyNotes: ["首や腰に不安がある日は通さない", "初期練習は必ず補助者とマットを使う"],
    coachComment: "バク転は勢いよりも、肩で押す時間を作れるかが大事です。怖さが強い時ほど段階を戻してください。",
    tags: ["由来メモあり", "後方", "補助推奨"],
    knowledgeStatus: "reviewing"
  },
  "ロンバク": {
    aliases: ["ロンダートバク転", "roundoff back handspring"],
    summary: "ロンダートの反発をバク転へつなぐ、連続アクロの入口になる接続技。",
    description:
      "ロンバクは、ロンダートで両足着地へまとめた反発を、そのままバク転へ渡す連続技です。単体のロンダートと単体のバク転ができていても、間の沈み込み、腕の戻し、目線の位置がそろわないと力が途切れます。ダブルダッチでは助走と着地後の余白が限られるため、ロンダートの抜け方向とバク転の手を着く位置をセットで決めます。",
    originNote:
      "日本語のロンバクは「ロンダート＋バク転」の略称です。英語では roundoff back handspring のように入口技と後方転回を並べて呼ぶため、技名を分解すると練習順もそのまま見えます。",
    practiceSteps: ["ロンダート単体で両足着地と反発を固定する", "ロンダート後に腕をすばやく戻して後方へ跳ぶ準備を作る", "バク転の着地後に次の一歩まで止めずに通す"],
    commonMistakes: ["ロンダート後に膝が深く沈んで反発が消える", "腕の戻しが遅れてバク転が後ろへ倒れ込む", "着地が横へ流れて縄のリズムへ戻れない"],
    safetyNotes: ["単体バク転の補助が外れてから連続へ進む", "連続練習ではターン側と着地点を先に共有する"],
    coachComment: "ロンバクは勢いを足す技ではなく、ロンダートの反発を途切れさせない技です。つなぎで沈まないことを最初の合格条件にすると安定します。",
    tags: ["由来メモあり", "接続技", "連続"],
    knowledgeStatus: "reviewing"
  },
  "ロン宙": {
    summary: "ロンダートの反発から後方宙返りへ入る、空中系の代表的な到達点。",
    description:
      "ロン宙はロンダートで作った反発を使って後方宙返りへ入る技です。ダブルダッチでは演技の山場になりやすい一方、ロンダートの角度、踏切位置、着地後の抜けがそろわないと縄に戻りにくくなります。単体の宙返り能力だけでなく、ロンダートの質を含めて見る技です。",
    originNote:
      "日本語のロン宙は、ロンダートから宙返りへつなぐ練習文脈で使われる略称です。英語圏では roundoff back tuck のように、入口技と宙返りの形を組み合わせて呼ぶことが多いです。",
    practiceSteps: ["ロンダート単体で反発と着地方向を固定する", "補助・マットで後方宙返りの抱え込みを確認する", "縄内では着地後の一歩目まで決めてから入る"],
    commonMistakes: ["ロンダートの着地で流れて踏切が遅れる", "抱え込みを急ぎすぎて高さが落ちる", "着地後にロープを見る余裕がなくなる"],
    safetyNotes: ["疲労時に回転量を増やさない", "着地点とターンの位置を共有してから練習する"],
    coachComment: "ロン宙は宙返りの技というより、ロンダートの反発をどれだけ空中に変換できるかを見る技です。",
    tags: ["由来メモあり", "後方宙返り", "山場"],
    knowledgeStatus: "reviewing"
  },
  "側宙": {
    aliases: ["サイド宙", "side flip", "side somi"],
    summary: "横方向の空中回転で足から立ち戻る、側方系から空中系へ進む節目の技。",
    description:
      "側宙は、側方へ踏み切って手を着かずに空中で横回転し、足で着地する技です。側転やエアリアルと近い入口に見えますが、手支持がない分、踏切で体を起こす時間と着地を見る余裕が必要です。ダブルダッチでは横幅を取りすぎるとロープやターン位置に近づくため、入る角度と着地後の一歩目を先に決めます。",
    originNote:
      "英語では side flip や side somi と呼ばれ、横方向の宙返りとして体操・アクロバット・トリッキングの文脈で使われます。この図鑑では、側転系の身体感覚から空中回転へ進む橋渡しとして整理しています。",
    practiceSteps: ["側転やエアリアルで横方向の入りをそろえる", "マット上で踏切と着地足を固定する", "縄内では横幅を小さくし、着地後にすぐ正面へ戻る"],
    commonMistakes: ["横へ飛びすぎて高さが出ない", "回転を急いで胸が落ち、着地が見えなくなる", "着地後に横へ流れて次の縄に遅れる"],
    safetyNotes: ["初期はマットと補助者を用意する", "着地足の膝や足首に不安がある日は反復しない"],
    coachComment: "側宙は横に飛ぶ技に見えますが、縄内では横幅を小さく見せる設計が大事です。着地後の向きまで含めて成功にしましょう。",
    tags: ["由来メモあり", "側方", "空中系"],
    knowledgeStatus: "reviewing"
  },
  "サイドフリップ": {
    aliases: ["side flip", "side tuck"],
    summary: "横向きに抱え込んで回る空中技。側宙よりも抱え込みと着地確認が前面に出ます。",
    description:
      "サイドフリップは、横方向の踏切から体を抱え込んで回る空中技です。側宙と近い系統ですが、抱え込みで回転をまとめるため、踏切の高さ、膝を引くタイミング、開くタイミングが見え方と安全性を左右します。ダブルダッチではターン位置に対して横へ流れすぎないよう、着地点を小さく設定します。",
    originNote:
      "side flip は英語圏で横方向の宙返りを表す素直な呼び名です。日本語のサイドフリップもそのまま輸入された呼び方として使われ、側宙系の中でもフリップらしい抱え込みを強調して整理できます。",
    practiceSteps: ["踏切で上に残る感覚を作る", "抱え込みと開くタイミングをマットで確認する", "縄内では横移動を抑えて着地後の抜けを固定する"],
    commonMistakes: ["横へ逃げて高さが不足する", "抱え込みを急いで頭が下がる", "開くタイミングが遅れて着地が詰まる"],
    safetyNotes: ["初期は補助者と厚いマットを使う", "疲労時に抱え込みを強めて無理に回さない"],
    coachComment: "サイドフリップは横回転の迫力が出やすい分、着地の向きが乱れやすい技です。縄内では着地後の一歩目まで決めると使いやすくなります。",
    tags: ["由来メモあり", "側方", "抱え込み"],
    knowledgeStatus: "reviewing"
  },
  "ゲイナー": {
    aliases: ["gainer", "cheat gainer"],
    summary: "前へ進む力を使いながら後方へ回る、片足系アクロの入口になる技。",
    description:
      "ゲイナーは、進行方向の勢いや片足の踏み込みを使いながら後方へ回る技です。通常のバク宙のようにその場で真後ろへ跳ぶというより、入りのステップ、蹴り上げ足、胸の残し方で斜めの軌道を作ります。ダブルダッチではステップが大きくなるとロープ周期に遅れるため、入りを短くして着地後の流れを作ります。",
    originNote:
      "gainer はアクロバットや飛び込みなどで、前方への移動に対して後方回転を行う技の呼び名として使われます。トリッキングではライズ、ムーンキック、コーク系へつながる片足・斜め軌道の基礎として理解すると整理しやすいです。",
    practiceSteps: ["片足踏切と蹴り上げ足を分けて確認する", "胸をすぐ畳まず、斜め上へ残る感覚を作る", "着地足と抜け方向を固定する"],
    commonMistakes: ["後ろへ倒れ込むだけで高さが出ない", "蹴り上げ足が流れて回転軸がずれる", "着地後にロープを見る余裕がなくなる"],
    safetyNotes: ["初期はマットと補助者を用意する", "腰を反りすぎる感覚がある日は中止する"],
    coachComment: "ゲイナーは後ろに投げる技ではなく、前へ進む力を斜め後方の回転へ変える技です。入りの一歩を小さくすると縄内で扱いやすくなります。",
    tags: ["由来メモあり", "片足", "斜め軌道"],
    knowledgeStatus: "reviewing"
  },
  "エアリアル": {
    summary: "手を着かずに側方回転を通す技。側転の延長で、蹴り上げと着地の向きが鍵になります。",
    description:
      "エアリアルは、側転に近い軌道を手支持なしで通す技です。ダブルダッチでは高さよりも、入る角度、蹴り上げ、着地後の流れが見え方を左右します。側転、片手側転、ロンダートとの違いを比較しながら、手を抜く前に腰の通り道を安定させます。",
    originNote:
      "英語の aerial は「空中の」という意味を持ち、手を着かない側方系アクロの呼び名として体操やトリッキングで広く使われます。縄内では横幅を取りすぎない aerial として調整することが実用上のポイントです。",
    practiceSteps: ["側転と片手側転で腰の通り道をそろえる", "蹴り上げ足と着地足を固定する", "縄内では低速で横幅と着地位置を確認する"],
    commonMistakes: ["手を抜くことだけを急いで腰が落ちる", "蹴り上げ足が横へ逃げて着地がずれる"],
    safetyNotes: ["初期はマットと補助で着地を確認する", "膝や足首に不安がある日は反復数を抑える"],
    coachComment: "手を着かない技ですが、練習では手を着く技の精度がそのまま出ます。",
    tags: ["由来メモあり", "側方", "手なし"],
    knowledgeStatus: "reviewing"
  },
  "ハンドスプリング": {
    aliases: ["前方転回", "front handspring"],
    summary: "前方へ跳び、手で床を押して足立ちへ戻る転回技。前方系アクロの土台になります。",
    description:
      "ハンドスプリングは、前方へ踏み込み、両手を着いて肩で床を押し返しながら足で着地する技です。ダブルダッチでは助走を長く取るより、手を着く距離、肩の押し、着地後の一歩目をそろえることが大切です。前宙や前方ひねりへ進む前に、前へ進む力を安全に受ける感覚を作ります。",
    originNote:
      "英語の handspring は、手をばねのように使って体を跳ね返す動きを表す呼び名です。日本語では前方転回として体操系の練習で扱われ、縄内では前方へ抜ける接続技として使いやすい位置づけです。",
    practiceSteps: ["踏み込みから手を着く距離を固定する", "肩で床を押し返して腰を通す", "着地後に胸を起こして次の一歩へつなぐ"],
    commonMistakes: ["手を近くに着いて腰が詰まる", "肩で押せずに背中から落ちる", "着地後に前へ倒れてロープに戻れない"],
    safetyNotes: ["初期はマットと補助で肩の押しを確認する", "手首や肩に痛みがある日は反復を避ける"],
    coachComment: "前に回る技ですが、焦点は回転よりも手で押し返す時間です。縄内では着地後の抜けまで作ると使いやすくなります。",
    tags: ["由来メモあり", "前方", "転回"],
    knowledgeStatus: "reviewing"
  },
  "バタフライツイスト": {
    aliases: ["butterfly twist", "b-twist"],
    summary: "水平に近いバタフライ軌道へひねりを加える、トリッキングらしい見せ技。",
    description:
      "バタフライツイストは、バタフライ系の横長い軌道にひねりを加える技です。縦に高く回る宙返りとは違い、胸の向き、肩の巻き込み、着地の流れで形が見えます。ダブルダッチではロープの高さよりも横幅と着地後のリズム復帰を管理すると演技に入れやすくなります。",
    originNote:
      "トリッキングでは butterfly setup から発展する代表的なひねり技として扱われます。武術的な蹴りの軌道と体操的な空中姿勢が混ざるため、名前も蝶のような横長い軌道から理解すると覚えやすいです。",
    practiceSteps: ["バタフライの入りで胸を低く保つ", "ひねり出しを急がず肩と目線をそろえる", "着地後に次のステップへ流す"],
    commonMistakes: ["縦回転にしようとして軌道が詰まる", "ひねり出しが早すぎて高さと横移動が消える"],
    safetyNotes: ["首を残したまま無理にひねらない", "滑る床では踏切と着地を避ける"],
    coachComment: "縄内で使うなら、大きく飛ぶよりも入る角度と着地後の流れを小さく設計する方が映えます。",
    tags: ["由来メモあり", "水平軌道", "トリッキング"],
    knowledgeStatus: "reviewing"
  },
  "ライズ": {
    aliases: ["raiz", "rise"],
    summary: "斜め後方へ体を倒しながら蹴り足を見せる、トリッキングとカポエイラの接点になる技。",
    description:
      "ライズは、片足の踏み込みから体を斜めに倒し、蹴り足を大きく見せながら反転する技です。宙返りのように縦にまとめるより、胸の開き、蹴り足の線、着地後の流れを見せます。ダブルダッチでは入りのステップが大きくなりやすいため、踏み込み位置を小さく設計します。",
    originNote:
      "Raiz はトリッキングやカポエイラ文脈で使われる呼び名です。厳密な語源の扱いは監修で確認しつつ、この図鑑ではゲイナー系やムーンキック系へつながる斜め軌道の入口として整理しています。",
    practiceSteps: ["踏み込み足と蹴り足を固定する", "胸を急に閉じず、斜めの軌道を残す", "着地足を決めて次のステップへ流す"],
    commonMistakes: ["後ろへ倒れ込むだけで蹴り足が見えない", "着地足が毎回変わって次の技につながらない"],
    safetyNotes: ["腰を反りすぎる感覚がある時は中止する", "初期は広い床で着地方向を確認する"],
    coachComment: "ライズは高さよりも角度の技です。縄内では大きく飛ぶより、蹴り足の線が見える角度を優先してください。",
    tags: ["由来メモあり", "片足", "斜め軌道"],
    knowledgeStatus: "reviewing"
  },
  "540": {
    aliases: ["540 kick", "five forty"],
    summary: "片足踏切から空中で回転し、蹴り足を見せて着地するトリッキング系の見せ技。",
    description:
      "540は、片足踏切から体を回し、蹴り足の軌道を見せながら着地する技です。名前は回転量のイメージで語られますが、練習では数字よりも踏切足、蹴り足、着地足の順番を固定することが重要です。ダブルダッチではロープの周期に対して入りが遅れないよう、ステップを小さくします。",
    originNote:
      "540 kick は武術系の蹴りとトリッキングの文脈で広く使われる呼び名です。回転数を表す名前ですが、縄内で使う時は回りきることよりも、蹴り足の形と着地後のリズム復帰を優先して整理します。",
    practiceSteps: ["踏切足と蹴り足を分けて確認する", "蹴り足を先に見せ、体を急いで丸めない", "着地後の一歩目まで同じ方向にそろえる"],
    commonMistakes: ["回転を急いで蹴り足が小さくなる", "着地で体が流れて次のロープに遅れる"],
    safetyNotes: ["膝や足首に違和感がある日は反復しない", "滑る床では踏切を避ける"],
    coachComment: "540は数字より形が見えるかが大事です。縄内では足の軌道が見えた瞬間に価値が出ます。",
    tags: ["由来メモあり", "蹴り", "片足"],
    knowledgeStatus: "reviewing"
  },
  "コークスクリュー": {
    aliases: ["corkscrew", "cork"],
    summary: "ゲイナー系の斜め回転にひねりを加える高難度トリッキング技。",
    description:
      "コークスクリューは、片足踏切やゲイナー系の斜め軌道にひねりを加える技です。縦の宙返りと横のひねりが混ざるため、入る足、胸の向き、着地足を固定してから練習します。ダブルダッチでは見栄えが強い反面、着地後に流れやすいので空間とターン位置の共有が必要です。",
    originNote:
      "英語の corkscrew は「らせん状にねじれるもの」を指す語で、トリッキングでは斜め軌道でねじれる見た目から cork と略されることがあります。発祥の厳密な初出は監修時に追記します。",
    practiceSteps: ["ゲイナーやライズ系の入りを安定させる", "ひねる前に高さと胸の向きを作る", "着地足を決めてから回転量を増やす"],
    commonMistakes: ["ひねりを急いで踏切の高さがなくなる", "着地足が毎回変わり、次の動きへつながらない"],
    safetyNotes: ["初回は補助者とマットを使う", "疲労時はひねり量を増やさない"],
    coachComment: "コークは名前の通りねじれが目立つ技ですが、成功率は入りの足と着地の設計で大きく変わります。",
    tags: ["由来メモあり", "高難度", "ひねり"],
    knowledgeStatus: "reviewing"
  },
  "マカコ": {
    aliases: ["monkey flip"],
    summary: "低い姿勢から片手を後ろに着き、後方へ体を返すカポエイラ由来の移行技。",
    description:
      "マカコは、しゃがみに近い低い姿勢から片手を背中側へ着き、もう一方の腕と脚を振って後方へ体を返す技です。バク転に似て見えますが、入りが低く、カポエイラの流れの中では移行や回避の質感を持ちます。ダブルダッチでは床に近いアクセントとして、起き上がりの速さまで含めて練習します。",
    originNote:
      "Macaco はポルトガル語で「猿」を意味し、カポエイラでは低い姿勢から後方へ体を返す動きとして知られます。猿が跳ねるような見た目から名前を理解すると、技の質感をつかみやすいです。",
    practiceSteps: ["片手を背中側に着く位置を確認する", "腰を上げてから脚を越す順番を作る", "着地後にすぐ縄のリズムへ戻る"],
    commonMistakes: ["先に頭を倒してしまい腰が上がらない", "手を遠くに着きすぎて肩が詰まる"],
    safetyNotes: ["肩と手首に痛みがある日は避ける", "後方のスペースを確認してから入る"],
    coachComment: "マカコは派手なバク転の代わりではなく、低さと流れを見せる技として使うと縄内で生きます。",
    knowledgeSourceUrls: ["https://en.wikipedia.org/wiki/List_of_capoeira_techniques#Macaco"],
    tags: ["由来メモあり", "カポエイラ", "低姿勢"],
    knowledgeStatus: "reviewing"
  },
  "ヘリコプテイロ": {
    aliases: ["aú helicóptero", "au helicoptero"],
    summary: "側転系の反転中に脚を円く入れ替える、ヘリコプターのようなカポエイラ系アクセント。",
    description:
      "ヘリコプテイロは、側転に近い反転の中で脚を円く入れ替え、通常の側転とは違う着地順や見え方を作る技です。ダブルダッチでは横幅と脚の円運動が見せ場になりますが、ロープに触れない幅で収める設計が必要です。",
    originNote:
      "カポエイラでは Aú helicóptero として、aú の反転中に脚がヘリコプターのように回る動きとして説明されます。名前は見た目の比喩として覚えるとわかりやすいです。",
    practiceSteps: ["通常の側転で反転のラインをそろえる", "脚の入れ替えだけを低速で確認する", "縄内では横幅と着地位置を小さく決める"],
    commonMistakes: ["脚を回すことに集中して手の支持が流れる", "横幅が大きくなりすぎてロープに近づく"],
    safetyNotes: ["手首と肩の支持が崩れる日は避ける", "周囲の人とターン位置を確認してから入る"],
    coachComment: "ヘリコプテイロは高さよりも脚の円運動の見え方が魅力です。縄内ではコンパクトさが武器になります。",
    knowledgeSourceUrls: ["https://en.wikipedia.org/wiki/List_of_capoeira_techniques#Other_kicks"],
    tags: ["由来メモあり", "カポエイラ", "側方"],
    knowledgeStatus: "reviewing"
  },
  "ムーンキック": {
    aliases: ["kick the moon", "moon kick", "chute na lua"],
    summary: "ゲイナー系の軌道で脚を月へ蹴り上げるように見せる、トリッキング/カポエイラ接点の技。",
    description:
      "ムーンキックは、ゲイナーやフラッシュキックに近い後方・斜めの軌道で、脚を高く蹴り上げながら回る技です。ダブルダッチでは蹴り足の線が見えやすい反面、着地後の流れが乱れやすいので、入りのステップと抜け方を先に決めておきます。",
    originNote:
      "英語では Kick the Moon とも呼ばれ、脚を上方向へ蹴り上げる見た目が名前の手がかりになります。カポエイラ文脈では Chute na lua という呼び名も見られ、トリッキングとカポエイラの境界で理解しやすい技です。",
    practiceSteps: ["ゲイナー系の入りで胸と目線を残す", "蹴り足を曲げずに高く見せる", "着地後に一歩でリズムへ戻る"],
    commonMistakes: ["蹴り足を急いで回しすぎて形が見えない", "着地が流れて次のステップが遅れる"],
    safetyNotes: ["腰を反りすぎて痛みが出る場合は中止する", "初期はマット上で着地足を固定する"],
    coachComment: "蹴り足の線が名前の由来に近い魅力です。縄内では大きさよりも脚の見え方を優先すると使いやすいです。",
    knowledgeSourceUrls: ["https://en.wikipedia.org/wiki/Moon_kick", "https://en.wikipedia.org/wiki/List_of_capoeira_techniques#Folha_Seca"],
    tags: ["由来メモあり", "蹴り", "ゲイナー"],
    knowledgeStatus: "reviewing"
  },
  "前宙": {
    aliases: ["前方宙返り", "front tuck", "front flip"],
    summary: "前方へ踏み切って空中で抱え込み、足で着地する前方回転の代表技。",
    description:
      "前宙は、前方へ踏み切り、空中で体を抱え込んで足で着地する技です。ダブルダッチでは勢いだけで前へ飛ぶと抜けが遅れるため、踏切位置、抱え込み、開くタイミングを分けて練習します。ハンドスプリングや跳び前転で前へ進む感覚を作ってから扱うと安全です。",
    originNote:
      "英語では front tuck や front flip と呼ばれ、前方宙返りの基本形として体操・タンブリングで扱われます。縄内では前へ進む距離を小さくし、着地後にロープへ戻れる形に調整することが実用上の要点です。",
    practiceSteps: ["踏切だけを分けて高さを作る", "抱え込みを急がず膝を胸へ引きつける", "開くタイミングと着地後の抜けを固定する"],
    commonMistakes: ["前へ飛び込みすぎて高さが出ない", "抱え込みが早すぎて着地を見る余裕がなくなる"],
    safetyNotes: ["初期はマットと補助者を用意する", "首や腰に不安がある日は通さない"],
    coachComment: "前宙は思い切りよりも、踏切で上に残れるかが大事です。縄内では移動距離を抑えるほど次へ戻りやすくなります。",
    tags: ["由来メモあり", "前方宙返り", "空中系"],
    knowledgeStatus: "reviewing"
  },
  "ウェブスター": {
    aliases: ["webster", "one-foot front flip"],
    summary: "片足踏切で前方へ回る空中技。蹴り上げ足と着地の流れが見え方を決めます。",
    description:
      "ウェブスターは、片足踏切から前方へ回る技です。両足踏切の前宙よりも入りのステップと蹴り上げ足が目立ち、トリッキング寄りの見せ方にもつながります。ダブルダッチでは助走を大きくせず、片足で入るタイミングと着地後のリズム復帰を先に決めます。",
    originNote:
      "Webster は片足踏切の前方回転として広く使われる呼び名です。名前の厳密な由来は監修時に確認し、この図鑑では前宙とゲイナー系の間にある片足踏切の入口として整理しています。",
    practiceSteps: ["片足踏切と蹴り上げ足を分けて確認する", "胸を落としすぎず前方へ回る", "着地足と抜け方向を固定する"],
    commonMistakes: ["蹴り上げ足だけが先行して回転が足りない", "着地で横へ流れて次の縄に戻れない"],
    safetyNotes: ["初期はマット上で着地足を固定する", "膝や足首に違和感がある日は反復しない"],
    coachComment: "ウェブスターは片足で入る分、形が出やすい技です。縄内では入りの一歩を小さくするほど扱いやすくなります。",
    tags: ["由来メモあり", "片足", "前方宙返り"],
    knowledgeStatus: "reviewing"
  },
  "フラッシュキック": {
    aliases: ["flash kick"],
    summary: "後方回転の中で片脚を伸ばして見せる、蹴りの形が印象に残る空中技。",
    description:
      "フラッシュキックは、後方回転の中で片脚を伸ばし、蹴りの線を見せる技です。バク宙に近い回転力が必要ですが、見せたい瞬間は脚の伸びと胸の向きにあります。ダブルダッチでは高さと着地後の抜けを優先し、脚を見せることだけを急がないようにします。",
    originNote:
      "英語圏でも flash kick と呼ばれ、後方回転にキックの形を加える技としてトリッキングやアクロバットで扱われます。名前は一瞬見える伸ばした脚の印象と結びつけると覚えやすいです。",
    practiceSteps: ["バク宙系の高さと着地を安定させる", "脚を伸ばす瞬間を動画で確認する", "着地後に一歩で縄のリズムへ戻る"],
    commonMistakes: ["脚を見せようとして回転が遅れる", "腰を反りすぎて着地が流れる"],
    safetyNotes: ["十分な後方回転の前提がない状態で通さない", "疲労時に脚の形だけを足さない"],
    coachComment: "フラッシュキックは形が強い技ですが、土台は後方回転です。まず安全に立てる高さを優先してください。",
    tags: ["由来メモあり", "蹴り", "後方宙返り"],
    knowledgeStatus: "reviewing"
  },
  "バク転→バク宙": {
    aliases: ["バク転バク宙", "back handspring back tuck"],
    summary: "バク転の反発を後方宙返りへ渡す、後方連続技の代表的な流れ。",
    description:
      "バク転→バク宙は、バク転で作った後方への反発を使って、そのまま後方宙返りへ入る連続技です。バク転の着地で胸が落ちるとバク宙の高さが消えるため、手で押した後に足で床を受け、腕を戻して上へ跳ぶ流れを分けて作ります。ダブルダッチでは着地後の位置がずれるとロープへ戻りにくくなるので、連続の終点を先に決めます。",
    originNote:
      "英語では back handspring back tuck のように、後方転回と後方宙返りを続けて表す呼び方が一般的です。日本語表記の矢印は、この図鑑では練習順と力の受け渡しを示す記号として扱っています。",
    practiceSteps: ["単体バク転で着地後に胸を起こす", "バク転後の腕の戻しと踏切だけを分けて練習する", "バク宙の着地後に一歩で縄のリズムへ戻る"],
    commonMistakes: ["バク転の着地で膝が沈みすぎて高さが消える", "バク宙へ急いで腕を振り遅れる", "終点が毎回ずれてターン位置が読めない"],
    safetyNotes: ["バク転とバク宙を単体で安定させてから連続へ進む", "初期は補助者、マット、十分な後方スペースを用意する"],
    coachComment: "この連続は、バク転を速くするよりもバク転の着地で次の踏切を作れるかが肝です。終点を決めて練習すると縄内に戻しやすくなります。",
    tags: ["由来メモあり", "連続", "後方宙返り"],
    knowledgeStatus: "reviewing"
  },
  "ロンバク宙": {
    aliases: ["ロンダートバク転宙返り", "roundoff back handspring back tuck"],
    summary: "ロンダート、バク転、後方宙返りを連続させる、反発を積み上げる空中系の山場。",
    description:
      "ロンバク宙は、ロンダートで反発を作り、バク転でさらに後方へ力をつなぎ、最後に後方宙返りへ入る連続技です。単体技の足し算ではなく、ロンダートの角度、バク転の手を着く距離、宙返り前の踏切姿勢が一本の流れとしてつながるかが重要です。ダブルダッチでは大きな見せ場になる一方、助走距離と着地後の復帰位置を細かく設計する必要があります。",
    originNote:
      "ロンバク宙は「ロンダート＋バク転＋宙返り」を縮めた日本語の練習用語です。英語では roundoff back handspring back tuck のように技を順番に並べるため、名前そのものがスキルツリーになっています。",
    practiceSteps: ["ロンバク単体で反発と終点を固定する", "バク転後に上へ跳ぶ踏切姿勢を作る", "最後の宙返り後にロープへ戻る一歩目まで決める"],
    commonMistakes: ["ロンダートが横へ流れてバク転の線がずれる", "バク転で手を近くに着き、宙返りの高さがなくなる", "最後の着地で前後に流れて次の隊形へ戻れない"],
    safetyNotes: ["各単体技とロンバクが安定してから扱う", "連続技は疲労の影響が大きいため本数を決めて練習する"],
    coachComment: "ロンバク宙はチェックリスト上の到達点ですが、見ている側には一本の流れとして見えます。途中で力が切れる場所を動画で探すと改善しやすいです。",
    tags: ["由来メモあり", "連続", "山場"],
    knowledgeStatus: "reviewing"
  },
  "ウインドミル": {
    aliases: ["windmill"],
    summary: "背中や肩を通りながら脚を大きく回す、ブレイキンの代表的な床回転。",
    description:
      "ウインドミルは、床に近い姿勢で背中や肩を通りながら脚を開いて回す技です。ダブルダッチではロープの下で低く大きい動きを見せられますが、回転幅、頭の位置、起き上がりのタイミングを管理する必要があります。単発でも質感が出るため、無理に回数を増やすより一周の形を安定させます。",
    originNote:
      "ウインドミルはブレイキンの代表的なパワームーブとして知られます。風車のように脚が円を描く見た目が名前の手がかりで、縄内では床回転のアクセントとして整理できます。",
    practiceSteps: ["背中から肩へ乗る通り道を確認する", "脚を閉じずに回転幅を保つ", "縄内では回転場所と起き上がり方向を固定する"],
    commonMistakes: ["頭や首に体重が乗りすぎる", "脚を急いで畳んで回転が止まる", "回転幅が読めずロープへ近づく"],
    safetyNotes: ["首、肩、腰に痛みがある日は行わない", "最初は広い床で回転幅を測る"],
    coachComment: "ウインドミルは回数よりシルエットです。縄内では一周でも大きく見えるので、安全な幅を先に決めてください。",
    tags: ["由来メモあり", "床回転", "ブレイキン"],
    knowledgeStatus: "reviewing"
  },
  "トーマス": {
    aliases: ["トーマスフレア", "thomas flair", "flare"],
    summary: "両脚を開いて円く振り回す床回転。体操のフレアとブレイキン表現をまたぐ技。",
    description:
      "トーマスは、手支持で両脚を開きながら円く振り回す床回転系の技です。ダブルダッチでは低い位置で大きな円を作れるため、床面のアクセントとして強い一方、ロープとの距離と手首・肩への負担管理が重要です。",
    originNote:
      "体操の pommel horse で知られる Thomas flair の系譜が名前の手がかりです。床で行うフレアはブレイキンのパワームーブとも接点があり、ダブルダッチでは床回転の見せ方として取り入れられます。",
    practiceSteps: ["開脚のまま腰を落とさず支持する", "片周ごとに手を置く位置を確認する", "縄内では回転幅を測ってから入る"],
    commonMistakes: ["脚を大きく見せようとして腰が落ちる", "手の置き換えが遅れて回転が止まる"],
    safetyNotes: ["手首、肩、股関節のウォームアップを十分に行う", "ロープとの距離を確保してから通す"],
    coachComment: "トーマスは回数よりも一周の形が大事です。縄内では半周でも見え方が強いので、無理に回数を増やさなくて大丈夫です。",
    knowledgeSourceUrls: ["https://www.gymnastics.sport/site/news/displaynews.php?idNews=2903"],
    tags: ["由来メモあり", "床回転", "パワームーブ"],
    knowledgeStatus: "reviewing"
  },
  "1990": {
    aliases: ["ナインティーンナインティ", "one hand spin"],
    summary: "片手倒立に近い形で縦軸回転する、ブレイキンの高難度パワームーブ。",
    description:
      "1990は、倒立に近い縦軸で片手回転へ入るブレイキン系の技です。ダブルダッチでは非常に強い見せ場になりますが、手首・肩・首への負担が大きく、床面とロープ幅の条件がそろった場面で扱う技です。",
    originNote:
      "ブレイキンでは 1990s / 2000s といった呼び名で、倒立系スピンのバリエーションとして知られています。名前の細かな由来には複数の語られ方があるため、ここでは高難度の handstand spin 系として整理しています。",
    practiceSteps: ["倒立支持と片手荷重を分けて作る", "低い回転練習で手首の負担を確認する", "縄内では回転場所と抜け方を固定する"],
    commonMistakes: ["片手へ乗る前に腰が折れる", "回転数を急いで支持手が流れる"],
    safetyNotes: ["手首、肩、首に違和感がある日は行わない", "十分な床スペースと補助者を確保する"],
    coachComment: "1990はチェックを埋めるために急ぐ技ではありません。倒立支持の質と安全条件がそろってから扱う高難度枠です。",
    knowledgeSourceUrls: ["https://en.wikipedia.org/wiki/Spin_(breakdancing_move)"],
    tags: ["由来メモあり", "倒立回転", "高難度"],
    knowledgeStatus: "reviewing"
  }
};

function mergeUnique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function applyKnowledgeOverride(trick: Trick): Trick {
  const override = knowledgeOverrides[trick.name];
  if (!override) return trick;

  return {
    ...trick,
    ...override,
    aliases: mergeUnique([...(trick.aliases ?? []), ...(override.aliases ?? [])]),
    tags: mergeUnique([...(trick.tags ?? []), ...(override.tags ?? [])]),
    knowledgeSourceUrls: mergeUnique([...(trick.knowledgeSourceUrls ?? []), ...(override.knowledgeSourceUrls ?? [])])
  };
}

function clampLevel(value: number): Trick["difficulty"] {
  return Math.max(1, Math.min(5, value)) as Trick["difficulty"];
}

function slugFor(index: number, name: string) {
  const normalized = name
    .toLowerCase()
    .replaceAll(".", "")
    .replaceAll("→", "-to-")
    .replaceAll("+", "plus")
    .replaceAll("α", "alpha")
    .replaceAll(" ", "-");

  const ascii = normalized.replace(/[^a-z0-9-]/g, "");
  return ascii ? `t${String(index + 1).padStart(3, "0")}-${ascii}` : `t${String(index + 1).padStart(3, "0")}`;
}

const removedHistoricIndexes = [0, 15, 16];

function stableHistoricIndex(visibleIndex: number) {
  let index = visibleIndex;
  for (const removedIndex of removedHistoricIndexes) {
    if (index >= removedIndex) index += 1;
  }
  return index;
}

function deriveFamily(name: string) {
  if (/(オリジナル技|空中系2つ以上の連続技)/.test(name)) return "連続・創作";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス|1\.5回ひねり|フルハイパー|溜め背面)/.test(name)) return "ひねり";
  if (/(ウインド|トーマス|エリオ|スワイプ|1990|2000|C\.C\.|コイン|ボム)/.test(name)) return "ブレイキン・床回転";
  if (/(倒立|ブリッジ|前転|後転|チェアー|プッシュアップ|肘|首抜き|背倒立|跳ね起き|ワーム|ドルフィン)/.test(name)) return "倒立・床基礎";
  if (/(バタフライ|エアリアル|スクート|ライズ|540|ガンビ|マカコ|ムーンキック|フラッシュキック|ヘリコプテイロ|ルーザー)/.test(name)) return "トリッキング";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ブランディー|ロケット|背面|横転|ロン横|カートサイド|カートアラビアン|反り宙|ジーザス|スワン|アックス)/.test(name)) return "空中回転";
  if (/(側転|ロンダート|^ロンバク$|^バク転$|連続バク転|ハンドスプリング|^カート$|片手ロンダート|かぶき|旋風脚)/.test(name)) return "側方・反発";
  if (/(前回り受け身|フロントスウィープ|バックスウィープ|^1歩$|スイング|振り上げ|屈伸ジャンプ|ブロッキング|パンチ|キャタピー|片足しゃがみ|ニューヨーク|サルフット|ドンキー|シフト|バックドンキー|ダブルシフト|ラビット|てんつく|ヘベルサオン|レインボー|ハローバック)/.test(name)) return "基礎ムーブ";
  return "その他";
}

function deriveAxis(name: string) {
  if (/(倒立|肘|1990|2000)/.test(name)) return "倒立軸";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス)/.test(name)) return "ひねり軸";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ロンダート|側転)/.test(name)) return "縦・横回転";
  if (/(ウインド|スワイプ|コイン|ボム|トーマス|エリオ)/.test(name)) return "床回転";
  return "移動・切り返し";
}

function deriveTakeoff(name: string) {
  if (/(倒立|肘|チェアー|プッシュアップ|ウインド|トーマス|エリオ|スワイプ|コイン|ボム)/.test(name)) return "手支持・床支持";
  if (/(片足|ウェブスター|ゲイナー|ライズ|540|コーク)/.test(name)) return "片足";
  if (/(ロンダート|ロン|バク転|宙|フリップ|バッファ)/.test(name)) return "助走・反発";
  return "その場";
}

function deriveLanding(name: string) {
  if (/(倒立|肘|チェアー|1990|2000)/.test(name)) return "手支持";
  if (/(ウインド|トーマス|エリオ|コイン|ボム|背倒立)/.test(name)) return "床・背中";
  if (/(ロンバク|テンポ|連続)/.test(name)) return "連続へ接続";
  return "足立ち";
}

function deriveRopeContext(level: number, name: string) {
  if (level <= 2) return "縄内アップ";
  if (/(連続|ロンバク|テンポ|スワイプス|ウインド)/.test(name)) return "縄内連続";
  if (level >= 8) return "パフォーマンス";
  return "縄内単発";
}

function deriveTags(name: string, level: number, family: string, discipline: string) {
  const tags = new Set<string>([discipline, family, `Lv.${level}`]);
  if (level <= 3) tags.add("基礎");
  if (level >= 7) tags.add("空中系");
  if (/(倒立|肘|チェアー)/.test(name)) tags.add("倒立");
  if (/(宙|フリップ|ウェブスター|ゲイナー)/.test(name)) tags.add("宙返り");
  if (/(ツイスト|ひねり|フル|コーク|ロデオ)/.test(name)) tags.add("ひねり");
  if (/(ロンダート|ロンバク|バク転)/.test(name)) tags.add("接続技");
  for (const tag of explicitTags[name] ?? []) tags.add(tag);
  return Array.from(tags);
}

function practiceFocus(name: string, family: string, discipline: string) {
  if (family === "基礎ムーブ") return "縄のリズムを崩さず、踏み替えや床移動を安定させることが練習の軸になります。";
  if (family === "倒立・床基礎") return "肩、体幹、受け身を整え、手支持や床支持の姿勢を崩さないことが重要です。";
  if (family === "側方・反発") return "手を着く位置、腰の通り道、着地後の反発をそろえると次の空中技へつながります。";
  if (family === "空中回転") return "踏切の高さ、回転姿勢、着地の向きを分けて確認しながら段階的に練習します。";
  if (family === "ひねり") return "回転にひねりを加えるため、目線、締め、着地方向を前提技で確認してから扱います。";
  if (discipline === "カポエイラ") return "手支持と蹴り上げの軌道を滑らかにつなぎ、勢いを止めずに切り返します。";
  if (family === "トリッキング") return "片足踏切や斜めの軌道を使うので、入り方と着地後の流れまでセットで見ます。";
  if (family === "ブレイキン・床回転") return "床支持の形、重心移動、回転の継続を安全に作ることが練習の中心です。";
  if (/連続|オリジナル/.test(name)) return "単体技の完成度を保ったまま、つなぎ方と見せ方を設計します。";
  return "分類と前提技を確認し、無理なく次の発展技へつなげます。";
}

function levelRole(level: number) {
  if (level <= 2) return "最初に固めたい基礎";
  if (level <= 5) return "発展技へ進むための中核";
  if (level <= 8) return "演技に入れやすい発展";
  return "十分な前提技が必要な高難度";
}

function familyConcept(family: string) {
  const guide = familyGuides[family];
  if (guide) return `${guide.summary}${guide.bodyFocus}`;
  return "この図鑑では、前提技から発展技へ進むための学習上の位置づけを重視しています。";
}

function disciplineBridge(discipline: string) {
  const guide = disciplineGuides[discipline];
  if (guide) return `${guide.roots}${guide.ropeUse}`;
  return "複数ジャンルの身体操作を、ダブルダッチの演技に使いやすい形で整理しています。";
}

function makeSummary(name: string, level: number, family: string, discipline: string) {
  return `${discipline} / ${family}の${levelRole(level)}技。${practiceFocus(name, family, discipline)}`;
}

function makeDescription(name: string, level: number, category: string, passCondition: string, family: string, discipline: string) {
  return `${name}は、${discipline}の要素を持つ${family}系の技です。${familyConcept(family)}レベル${level}「${category}」では「${passCondition}」が目安です。${practiceFocus(
    name,
    family,
    discipline
  )} ${disciplineBridge(discipline)} 前提技・派生技・近い技は相関図で確認できます。`;
}

function makeOriginNote(name: string, family: string, discipline: string) {
  const disciplineGuide = disciplineGuides[discipline];
  const familyGuide = familyGuides[family];
  return `${name}の厳密な発祥・初出は監修時に追記します。現時点では、技名の由来を断定するよりも、どのジャンルの身体操作として読み解けるかを優先して整理しています。${
    disciplineGuide?.roots ?? disciplineBridge(discipline)
  }${familyGuide?.roots ?? ""}${familyGuide?.ropeUse ?? ""}`;
}

function makePracticeSteps(name: string, family: string, discipline: string) {
  if (family === "基礎ムーブ") return ["縄なしで足順とリズムを確認する", "低速の縄で入る位置と抜ける位置を固定する", "音楽テンポでも姿勢が崩れないか確認する"];
  if (family === "倒立・床基礎") return ["マット上で形と受け身を確認する", "肩と体幹を締めたまま静止または移動する", "縄内では入る前後の姿勢までセットで練習する"];
  if (family === "側方・反発") return ["手を着く位置と目線を決める", "腰の通り道と着地足をそろえる", "ロンダートやバク転など次の技へつなぐ反発を確認する"];
  if (family === "空中回転") return ["踏切だけを分けて高さを作る", "補助やマットで回転姿勢を確認する", "着地方向を決めてから縄内のタイミングに合わせる"];
  if (family === "ひねり") return ["ひねりを入れない前提技を安定させる", "目線と肩の開きを小さく確認する", "着地の向きを決めてから回転量を増やす"];
  if (family === "ブレイキン・床回転") return ["床で支持点と重心移動を確認する", "回転を止めずに次の支持点へ乗せる", "縄内では回転幅とロープ接触の余裕を見る"];
  if (family === "トリッキング" || discipline === "カポエイラ") return ["入りのステップをゆっくり確認する", "蹴り上げや片足踏切の軌道をそろえる", "着地後に次の動きへ流せるか確認する"];
  if (/連続|オリジナル/.test(name)) return ["単体技をそれぞれ成功率高くそろえる", "つなぎの足順と向きを決める", "動画で流れと見え方を確認する"];
  return ["縄なしで形を確認する", "低速でタイミングを合わせる", "相関図で前提技と派生技を確認する"];
}

function makeCommonMistakes(family: string) {
  if (family === "基礎ムーブ") return ["足順だけを追って上体が遅れる", "ロープを見る時間が長くなりリズムが止まる"];
  if (family === "倒立・床基礎") return ["肩が抜けて腰が反る", "手を着く位置が近すぎて受け身が狭くなる"];
  if (family === "側方・反発") return ["手の着地位置がずれて進行方向が曲がる", "着地で沈み込みすぎて次の反発が消える"];
  if (family === "空中回転") return ["踏切前に急いで高さが出ない", "着地を見る前に体をほどいてしまう"];
  if (family === "ひねり") return ["ひねり出しが早すぎて高さが落ちる", "目線と肩が開きすぎて着地方向がずれる"];
  if (family === "ブレイキン・床回転") return ["支持点が流れて回転軸が大きくぶれる", "床との距離感が狭くなりロープに近づきすぎる"];
  return ["入りのタイミングが毎回変わる", "成功後の抜け方まで決めていない"];
}

function makeSafetyNotes(family: string, level: number) {
  const base = level >= 7 ? ["初回は補助者とマットを用意する", "疲労時は回転量やひねり量を増やさない"] : ["痛みがある日は無理に通さない"];
  if (family === "倒立・床基礎" || family === "ブレイキン・床回転") return [...base, "手首、肩、首に負担が出る形はすぐに止める"];
  if (family === "空中回転" || family === "ひねり" || family === "側方・反発") return [...base, "着地点の周囲とロープ位置を確認してから入る"];
  return [...base, "ターン側と入る位置を共有してから練習する"];
}

function makeCoachComment(family: string) {
  return `監修メモ未設定。${family}系として、成功条件・補助方法・縄内での注意点を監修後に追記してください。`;
}

export function getAllTricks(): Trick[] {
  const seen = new Map<string, Trick>();
  let visibleIndex = 0;

  for (const level of levelTests) {
    for (const name of level.trickNames) {
      if (seen.has(name)) continue;
      const historicIndex = stableHistoricIndex(visibleIndex);

      const family = deriveFamily(name);
      const discipline = deriveDiscipline(name, family);
      const axis = deriveAxis(name);
      const trick = applyKnowledgeOverride({
        id: `trick-${String(historicIndex + 1).padStart(3, "0")}`,
        slug: slugFor(historicIndex, name),
        name,
        aliases: explicitAliases[name] ?? [],
        summary: makeSummary(name, level.level, family, discipline),
        description: makeDescription(name, level.level, level.category, level.passCondition, family, discipline),
        originNote: makeOriginNote(name, family, discipline),
        practiceSteps: makePracticeSteps(name, family, discipline),
        commonMistakes: makeCommonMistakes(family),
        safetyNotes: makeSafetyNotes(family, level.level),
        coachComment: makeCoachComment(family),
        knowledgeStatus: "draft",
        knowledgeReviewedBy: "",
        knowledgeSourceUrls: [],
        showKnowledgeSources: false,
        difficulty: difficultyByLevel.get(level.level) ?? clampLevel(Math.ceil(level.level / 2)),
        riskLevel: riskByLevel.get(level.level) ?? clampLevel(Math.ceil(level.level / 2)),
        discipline,
        family,
        axis,
        takeoff: deriveTakeoff(name),
        landing: deriveLanding(name),
        ropeContext: deriveRopeContext(level.level, name),
        tags: deriveTags(name, level.level, family, discipline),
        level: level.level,
        levelCategory: level.category,
        status: "published",
        sourceId: level.sourceId,
        showSource: false
      });

      seen.set(name, trick);
      visibleIndex += 1;
    }
  }

  return Array.from(seen.values());
}

export const allTricks = getAllTricks();

const trickByName = new Map(allTricks.map((trick) => [trick.name, trick]));
const trickBySlug = new Map(allTricks.map((trick) => [trick.slug, trick]));
const sourceById = new Map(sources.map((source) => [source.id, source]));

export function getTrickBySlug(slug: string) {
  return trickBySlug.get(slug);
}

export function getSourceById(id: string) {
  return sourceById.get(id);
}

export function getRelations(): TrickRelation[] {
  return data.relations
    .map((relation, index): TrickRelation | null => {
      const from = trickByName.get(relation.from);
      const to = trickByName.get(relation.to);
      if (!from || !to) return null;
      return {
        id: `relation-${String(index + 1).padStart(3, "0")}`,
        fromTrickId: from.id,
        toTrickId: to.id,
        type: relation.type,
        note: relation.note,
        strength: relation.strength,
        waypoints: []
      } satisfies TrickRelation;
    })
    .filter((relation): relation is TrickRelation => Boolean(relation));
}

export const trickRelations = getRelations();

export function getMapPositions(): TrickMapPosition[] {
  return (data.mapPositions ?? [])
    .map((position) => {
      const trick = trickByName.get(position.name);
      if (!trick) return null;
      return {
        trickId: trick.id,
        x: position.x,
        y: position.y
      } satisfies TrickMapPosition;
    })
    .filter((position): position is TrickMapPosition => Boolean(position));
}

export const mapPositions = getMapPositions();

export function getRelationsForTrick(trickId: string) {
  const incoming = trickRelations.filter((relation) => relation.toTrickId === trickId);
  const outgoing = trickRelations.filter((relation) => relation.fromTrickId === trickId);
  return { incoming, outgoing };
}

export function getTrickById(id: string) {
  return allTricks.find((trick) => trick.id === id);
}

export function getFeaturedTricks() {
  const featured = new Set(data.featured);
  return allTricks.filter((trick) => featured.has(trick.name));
}

export function getFilterOptions() {
  return {
    disciplines: sortDisciplines(Array.from(new Set(allTricks.map((trick) => trick.discipline)))),
    families: sortFamilies(Array.from(new Set(allTricks.map((trick) => trick.family)))),
    axes: Array.from(new Set(allTricks.map((trick) => trick.axis))).sort(),
    takeoffs: Array.from(new Set(allTricks.map((trick) => trick.takeoff))).sort(),
    landings: Array.from(new Set(allTricks.map((trick) => trick.landing))).sort(),
    ropeContexts: Array.from(new Set(allTricks.map((trick) => trick.ropeContext))).sort(),
    tags: Array.from(new Set(allTricks.flatMap((trick) => trick.tags))).sort()
  };
}
