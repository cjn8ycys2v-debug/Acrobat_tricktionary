import fs from "node:fs";
import path from "node:path";

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "atlas-data.json"), "utf8"));

const difficultyByLevel = new Map([
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

const riskByLevel = new Map([
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

const explicitAliases = {
  側転: ["カートホイール", "cartwheel"],
  ロンダート: ["ラウンドオフ", "roundoff", "round-off"],
  バク転: ["バック転", "バックハンドスプリング", "back handspring"],
  ハンドスプリング: ["前方転回", "front handspring"],
  前宙: ["前方宙返り", "front flip"],
  バク宙: ["バック宙", "後方宙返り", "back flip"],
  ロン宙: ["ロンダート宙返り", "roundoff back tuck"],
  エアリアル: ["aerial"],
  バタフライツイスト: ["B-twist", "btwist"],
  コークスクリュー: ["corkscrew", "cork"],
  ウインドミル: ["windmill"],
  トーマス: ["トーマスフレア", "flare"],
  マカコ: ["macaco"],
  ヘリコプテイロ: ["helicoptero"]
};

const disciplineGuides = {
  ダブルダッチ: {
    roots: "ロープを跳ぶ競技・パフォーマンスの文脈で発展した動きが中心です。技そのものより、入る位置、抜ける位置、リズムを崩さないことが名前や価値に直結します。",
    ropeUse: "縄内アップ、演技のつなぎ、アクロ後の抜けに使いやすい分類です。"
  },
  体操: {
    roots: "器械体操や床運動で整理されてきた倒立、転回、宙返りの考え方を、ダブルダッチで扱いやすい単位に分けています。",
    ropeUse: "助走距離を短くし、着地後にロープへ戻れる余白を残すと縄内で使いやすくなります。"
  },
  トリッキング: {
    roots: "武術的な蹴り、体操的な回転、ストリート系の見せ方が混ざったトリッキング由来の動きを整理しています。",
    ropeUse: "縄内では入りのステップを小さく作り、着地後に次のステップへ流せる技を優先すると扱いやすくなります。"
  },
  ブレイキン: {
    roots: "ブレイキンのフットワーク、パワームーブ、フリーズの考え方を、縄内で使う床技として整理しています。",
    ropeUse: "ロープに触れない低さと回転幅を把握し、ターン側に見せたい面を向けると演技に組み込みやすくなります。"
  },
  カポエイラ: {
    roots: "カポエイラの蹴りと回避動作に近い、円を描くような身体操作をアクロ技として扱います。",
    ropeUse: "縄内では横幅を取りすぎない入り方と、着地後にすぐリズムへ戻る設計が重要です。"
  },
  その他: {
    roots: "既存技の組み合わせやチーム独自の見せ方を、学習上のまとまりとして扱います。",
    ropeUse: "演技構成の山場やチームの個性を出す場面で使いやすい分類です。"
  }
};

const familyGuides = {
  基礎ムーブ: {
    summary: "縄の中で崩れない足順、低い姿勢、床移動を作る入口の系統。",
    roots: "ダブルダッチのステップ、床への入り、起き上がりを練習技として切り出した分類です。",
    bodyFocus: "足順、目線、上体の遅れ、床から戻る速さをそろえます。",
    ropeUse: "ウォームアップ、アクロ前の入り、技後のリカバリーに使いやすいです。"
  },
  "倒立・床基礎": {
    summary: "手支持、受け身、肩の押し、体幹の締めを作る土台の系統。",
    roots: "体操やブレイキンの床支持を、空中技へ進む前の身体準備として整理しています。",
    bodyFocus: "手首、肩、首を守りながら、体を支える形と受け身を反復します。",
    ropeUse: "縄内では低い動きのアクセントにもなりますが、まず安全な支持姿勢を優先します。"
  },
  "側方・反発": {
    summary: "側転、ロンダート、バク転など、床を押して次の技へ反発を残す系統。",
    roots: "体操の転回系を中心に、ダブルダッチで助走を短く使える接続技として整理しています。",
    bodyFocus: "手を着く位置、腰の通り道、着地後に沈まない反発を見ます。",
    ropeUse: "ロンダートやバク転は、空中系へ入る前の接続として演技構成の軸になります。"
  },
  空中回転: {
    summary: "踏切で高さを作り、空中で姿勢をまとめ、着地でほどく系統。",
    roots: "床運動やアクロバットの宙返り系を、縄内単発や演技の見せ場として扱います。",
    bodyFocus: "踏切、高さ、抱え込み、開くタイミング、着地の向きを分けて確認します。",
    ropeUse: "縄内では入るタイミングと着地後の抜け方を先に決めると成功率が上がります。"
  },
  ひねり: {
    summary: "回転に肩、目線、骨盤の向きを加えて方向変化を見せる発展系統。",
    roots: "体操、トリッキング、空中回転のひねり要素を、学習上の難度でまとめています。",
    bodyFocus: "高さを作ってからひねる順番、目線、締め、着地方向を管理します。",
    ropeUse: "縄内では見栄えが強い一方で、着地の向きが崩れると次の抜けが難しくなります。"
  },
  トリッキング: {
    summary: "片足踏切や蹴り足を使い、斜めの軌道で見せる技の系統。",
    roots: "武術・体操・ストリート表現が混ざったトリッキング技を、縄内で扱える単位に整理しています。",
    bodyFocus: "入りのステップ、蹴り足、胸の向き、着地後の流れをセットで見ます。",
    ropeUse: "ステップが大きくなりやすいので、縄内では入りを小さく設計するのが鍵です。"
  },
  "ブレイキン・床回転": {
    summary: "床支持と重心移動で回転やフリーズ感を出す系統。",
    roots: "ブレイキンのパワームーブやフリーズを、ダブルダッチの床技として扱います。",
    bodyFocus: "支持点、回転軸、床との距離、手首・肩・首の負担を管理します。",
    ropeUse: "低さと幅を調整できると、ロープの下で質感のあるアクセントになります。"
  },
  "連続・創作": {
    summary: "複数の技を順番、向き、音取りでつなぐ構成寄りの系統。",
    roots: "単体技ではなく、チームや個人の構成の中で作られる組み合わせを扱います。",
    bodyFocus: "成功率、つなぎの足順、方向転換、疲労時の再現性を見ます。",
    ropeUse: "演技の山場を作りやすい一方で、前後のターンとスペース設計が必要です。"
  },
  その他: {
    summary: "分類に収まりにくい技を、学習上の位置づけで整理する系統。",
    roots: "創作技、複合技、呼び名がチームによって揺れる技を受け止めるための分類です。",
    bodyFocus: "どの身体操作に近いかを見つけ、前提技へ分解します。",
    ropeUse: "チーム固有の見せ方や演技構成のアクセントとして扱います。"
  }
};

function sql(value) {
  if (value == null) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function array(values) {
  if (!values.length) return "array[]::text[]";
  return `array[${values.map(sql).join(", ")}]`;
}

function slugFor(index, name) {
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

function stableHistoricIndex(visibleIndex) {
  let index = visibleIndex;
  for (const removedIndex of removedHistoricIndexes) {
    if (index >= removedIndex) index += 1;
  }
  return index;
}

function family(name) {
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

function discipline(name, fam) {
  if (/(ウインド|トーマス|エリオ|スワイプ|1990|2000|C\.C\.|コイン|ボム|チェアー)/.test(name) || fam === "ブレイキン・床回転") return "ブレイキン";
  if (/(マカコ|ヘベルサオン|ヘリコプテイロ|エアツイガンビ|ガンビ|ライズ)/.test(name)) return "カポエイラ";
  if (/(バタフライ|エアリアル|スクート|540|コーク|ロデオ|クロスアウト|Aトラックス|フラッシュキック|ムーンキック|ルーザー|フルハイパー|フルロール|ラップフル)/.test(name)) return "トリッキング";
  if (/(前回り受け身|フロントスウィープ|バックスウィープ|^1歩$|スイング|振り上げ|屈伸ジャンプ|ブロッキング|パンチ|キャタピー|片足しゃがみ|ニューヨーク|サルフット|ドンキー|シフト|バックドンキー|ダブルシフト|ラビット|てんつく|レインボー|ハローバック)/.test(name) || fam === "基礎ムーブ") return "ダブルダッチ";
  if (/(オリジナル技|空中系2つ以上の連続技)/.test(name)) return "その他";
  return "体操";
}

function axis(name) {
  if (/(倒立|肘|1990|2000)/.test(name)) return "倒立軸";
  if (/(ツイスト|ひねり|フル|コーク|ロデオ|クロスアウト|Aトラックス)/.test(name)) return "ひねり軸";
  if (/(宙|フリップ|ウェブスター|ゲイナー|バッファ|ロンダート|側転)/.test(name)) return "縦・横回転";
  if (/(ウインド|スワイプ|コイン|ボム|トーマス|エリオ)/.test(name)) return "床回転";
  return "移動・切り返し";
}

function takeoff(name) {
  if (/(倒立|肘|チェアー|プッシュアップ|ウインド|トーマス|エリオ|スワイプ|コイン|ボム)/.test(name)) return "手支持・床支持";
  if (/(片足|ウェブスター|ゲイナー|ライズ|540|コーク)/.test(name)) return "片足";
  if (/(ロンダート|ロン|バク転|宙|フリップ|バッファ)/.test(name)) return "助走・反発";
  return "その場";
}

function landing(name) {
  if (/(倒立|肘|チェアー|1990|2000)/.test(name)) return "手支持";
  if (/(ウインド|トーマス|エリオ|コイン|ボム|背倒立)/.test(name)) return "床・背中";
  if (/(ロンバク|テンポ|連続)/.test(name)) return "連続へ接続";
  return "足立ち";
}

function ropeContext(level, name) {
  if (level <= 2) return "縄内アップ";
  if (/(連続|ロンバク|テンポ|スワイプス|ウインド)/.test(name)) return "縄内連続";
  if (level >= 8) return "パフォーマンス";
  return "縄内単発";
}

function focus(name, fam, disc) {
  if (fam === "基礎ムーブ") return "縄のリズムを崩さず、踏み替えや床移動を安定させることが練習の軸になります。";
  if (fam === "倒立・床基礎") return "肩、体幹、受け身を整え、手支持や床支持の姿勢を崩さないことが重要です。";
  if (fam === "側方・反発") return "手を着く位置、腰の通り道、着地後の反発をそろえると次の空中技へつながります。";
  if (fam === "空中回転") return "踏切の高さ、回転姿勢、着地の向きを分けて確認しながら段階的に練習します。";
  if (fam === "ひねり") return "回転にひねりを加えるため、目線、締め、着地方向を前提技で確認してから扱います。";
  if (disc === "カポエイラ") return "手支持と蹴り上げの軌道を滑らかにつなぎ、勢いを止めずに切り返します。";
  if (fam === "トリッキング") return "片足踏切や斜めの軌道を使うので、入り方と着地後の流れまでセットで見ます。";
  if (fam === "ブレイキン・床回転") return "床支持の形、重心移動、回転の継続を安全に作ることが練習の中心です。";
  if (/連続|オリジナル/.test(name)) return "単体技の完成度を保ったまま、つなぎ方と見せ方を設計します。";
  return "分類と前提技を確認し、無理なく次の発展技へつなげます。";
}

function levelRole(level) {
  if (level <= 2) return "最初に固めたい基礎";
  if (level <= 5) return "発展技へ進むための中核";
  if (level <= 8) return "演技に入れやすい発展";
  return "十分な前提技が必要な高難度";
}

function familyConcept(fam) {
  const guide = familyGuides[fam];
  if (guide) return `${guide.summary}${guide.bodyFocus}`;
  return "この図鑑では、前提技から発展技へ進むための学習上の位置づけを重視しています。";
}

function disciplineBridge(disc) {
  const guide = disciplineGuides[disc];
  if (guide) return `${guide.roots}${guide.ropeUse}`;
  return "複数ジャンルの身体操作を、ダブルダッチの演技に使いやすい形で整理しています。";
}

function originNote(name, fam, disc) {
  const disciplineGuide = disciplineGuides[disc];
  const familyGuide = familyGuides[fam];
  return `${name}は、現時点では個別の初出を断定せず、身体操作のルーツから読み解く技として整理しています。図鑑では名前の由来だけでなく、どのジャンルの文脈から来て、ダブルダッチの中でどう使いやすいかを重視します。${
    disciplineGuide?.roots ?? disciplineBridge(disc)
  }${familyGuide?.roots ?? ""}${familyGuide?.ropeUse ?? ""}`;
}

function practiceSteps(fam, disc, name) {
  if (fam === "基礎ムーブ") return ["縄なしで足順とリズムを確認する", "低速の縄で入る位置と抜ける位置を固定する", "音楽テンポでも姿勢が崩れないか確認する"];
  if (fam === "倒立・床基礎") return ["マット上で形と受け身を確認する", "肩と体幹を締めたまま静止または移動する", "縄内では入る前後の姿勢までセットで練習する"];
  if (fam === "側方・反発") return ["手を着く位置と目線を決める", "腰の通り道と着地足をそろえる", "ロンダートやバク転など次の技へつなぐ反発を確認する"];
  if (fam === "空中回転") return ["踏切だけを分けて高さを作る", "補助やマットで回転姿勢を確認する", "着地方向を決めてから縄内のタイミングに合わせる"];
  if (fam === "ひねり") return ["ひねりを入れない前提技を安定させる", "目線と肩の開きを小さく確認する", "着地の向きを決めてから回転量を増やす"];
  if (fam === "ブレイキン・床回転") return ["床で支持点と重心移動を確認する", "回転を止めずに次の支持点へ乗せる", "縄内では回転幅とロープ接触の余裕を見る"];
  if (fam === "トリッキング" || disc === "カポエイラ") return ["入りのステップをゆっくり確認する", "蹴り上げや片足踏切の軌道をそろえる", "着地後に次の動きへ流せるか確認する"];
  if (/連続|オリジナル/.test(name)) return ["単体技をそれぞれ成功率高くそろえる", "つなぎの足順と向きを決める", "動画で流れと見え方を確認する"];
  return ["縄なしで形を確認する", "低速でタイミングを合わせる", "相関図で前提技と派生技を確認する"];
}

function commonMistakes(fam) {
  if (fam === "基礎ムーブ") return ["足順だけを追って上体が遅れる", "ロープを見る時間が長くなりリズムが止まる", "終わり位置が曖昧で次の技へ入れない"];
  if (fam === "倒立・床基礎") return ["肩が抜けて腰が反る", "手を着く位置が近すぎて受け身が狭くなる", "降り方を決めずに崩れてしまう"];
  if (fam === "側方・反発") return ["手の着地位置がずれて進行方向が曲がる", "着地で沈み込みすぎて次の反発が消える", "胸の返しが遅れて縄内の向きへ戻れない"];
  if (fam === "空中回転") return ["踏切前に急いで高さが出ない", "着地を見る前に体をほどいてしまう", "回った後の一歩目が決まっておらずロープへ戻れない"];
  if (fam === "ひねり") return ["ひねり出しが早すぎて高さが落ちる", "目線と肩が開きすぎて着地方向がずれる", "前提技の回転軸が崩れたままひねりを足してしまう"];
  if (fam === "ブレイキン・床回転") return ["支持点が流れて回転軸が大きくぶれる", "床との距離感が狭くなりロープに近づきすぎる", "起き上がり方向を決めずに次の動きへ遅れる"];
  if (fam === "トリッキング") return ["入りのステップが大きくなり縄内の幅を使いすぎる", "蹴り足だけを急いで胸の向きが遅れる", "着地後の流れが止まり次のステップへつながらない"];
  if (fam === "連続・創作") return ["単体技の成功率が低いまま連続にしてしまう", "つなぎの足順や向きが毎回変わる", "山場の後にロープへ戻る出口を決めていない"];
  return ["入りのタイミングが毎回変わる", "成功後の抜け方まで決めていない", "どの前提技に近いかを分解せずに練習してしまう"];
}

function safetyNotes(fam, level) {
  const base = level >= 7 ? ["初回は補助者とマットを用意する", "疲労時は回転量やひねり量を増やさない"] : ["痛みがある日は無理に通さない"];
  if (fam === "空中回転" || fam === "ひねり" || fam === "側方・反発") return [...base, "着地点の周囲とロープ位置を確認してから入る"];
  return [...base, "ターン側と入る位置を共有してから練習する"];
}

function coachComment(fam) {
  if (fam === "基礎ムーブ") return "この系統は派手さより再現性です。入る位置、終わる位置、次の一歩を決めると、縄の中で急に使いやすくなります。";
  if (fam === "倒立・床基礎") return "倒立・床基礎は、できた回数より安全に戻れる形を優先してください。手首、肩、首に違和感が出る形は成功扱いにしない方が伸びます。";
  if (fam === "側方・反発") return "側方・反発系は、着地で力を失わないことが次の技への鍵です。単体で止まるだけでなく、次に何へ進むかまでセットで見ましょう。";
  if (fam === "空中回転") return "空中回転は、踏切、高さ、姿勢、着地を分けて見ると修正しやすくなります。縄内では着地後の一歩目まで成功条件にしてください。";
  if (fam === "ひねり") return "ひねり系は、前提技の高さと軸が残っている時だけ回転量を増やしましょう。早くひねるより、どこを向いて降りるかを決める方が安定します。";
  if (fam === "ブレイキン・床回転") return "床回転系は、見た目の勢いと同じくらい幅の管理が大事です。ロープに近づく方向と起き上がる方向を先に決めてください。";
  if (fam === "トリッキング") return "トリッキング系は、蹴り足だけでなく入りのステップと着地後の流れが見栄えを作ります。縄内では小さく入って大きく見せる意識が役立ちます。";
  if (fam === "連続・創作") return "連続・創作系は、難しい技を並べるより、つなぎの足順と向きが整理されている方が強く見えます。動画で出口まで確認しましょう。";
  return "分類が曖昧な技ほど、前提技へ分解すると練習しやすくなります。名前よりも、入口、軸、着地、次の一歩を記録してください。";
}

const source = data.sources[0];
const sourceUuid = "00000000-0000-4000-8000-000000000001";
const trickUuids = new Map();
let visibleTrickIndex = 0;
const lines = [
  "begin;",
  `insert into public.sources (id, source_key, title, kind, url, show_by_default) values (${sql(sourceUuid)}, ${sql(source.id)}, ${sql(source.title)}, ${sql(source.kind)}, ${sql(source.url)}, false) on conflict (source_key) do nothing;`
];

for (const level of data.levels) {
  for (const name of level.trickNames) {
    if (trickUuids.has(name)) continue;
    const historicIndex = stableHistoricIndex(visibleTrickIndex);
    const id = `00000000-0000-4000-9000-${String(historicIndex + 1).padStart(12, "0")}`;
    trickUuids.set(name, id);
    const fam = family(name);
    const disc = discipline(name, fam);
    const tags = [disc, fam, `Lv.${level.level}`];
    const practiceFocus = focus(name, fam, disc);
    lines.push(
      `insert into public.tricks (id, slug, name, aliases, summary, description, origin_note, practice_steps, common_mistakes, safety_notes, coach_comment, knowledge_status, knowledge_reviewed_by, knowledge_source_urls, show_knowledge_sources, difficulty, risk_level, discipline, family, axis, takeoff, landing, rope_context, tags, level, level_category, status, source_id, show_source) values (` +
        [
          sql(id),
          sql(slugFor(historicIndex, name)),
          sql(name),
          array(explicitAliases[name] ?? []),
          sql(`${disc} / ${fam}の${levelRole(level.level)}技。${practiceFocus}`),
          sql(
            `${name}は、${disc}の要素を持つ${fam}系の技です。${familyConcept(fam)}レベル${level.level}「${level.category}」では「${level.passCondition}」が目安です。${practiceFocus} ${disciplineBridge(
              disc
            )} 前提技・派生技・近い技は相関図で確認できます。`
          ),
          sql(originNote(name, fam, disc)),
          array(practiceSteps(fam, disc, name)),
          array(commonMistakes(fam)),
          array(safetyNotes(fam, level.level)),
          sql(coachComment(fam)),
          sql("draft"),
          sql(""),
          "array[]::text[]",
          "false",
          difficultyByLevel.get(level.level) ?? 3,
          riskByLevel.get(level.level) ?? 3,
          sql(disc),
          sql(fam),
          sql(axis(name)),
          sql(takeoff(name)),
          sql(landing(name)),
          sql(ropeContext(level.level, name)),
          array(tags),
          level.level,
          sql(level.category),
          sql("published"),
          sql(sourceUuid),
          "false"
        ].join(", ") +
        ") on conflict (slug) do update set aliases = excluded.aliases, summary = excluded.summary, description = excluded.description, origin_note = excluded.origin_note, practice_steps = excluded.practice_steps, common_mistakes = excluded.common_mistakes, safety_notes = excluded.safety_notes, coach_comment = excluded.coach_comment, difficulty = excluded.difficulty, risk_level = excluded.risk_level, discipline = excluded.discipline, family = excluded.family, axis = excluded.axis, takeoff = excluded.takeoff, landing = excluded.landing, rope_context = excluded.rope_context, tags = excluded.tags, level = excluded.level, level_category = excluded.level_category, status = excluded.status, source_id = excluded.source_id;"
    );
    visibleTrickIndex += 1;
  }
}

for (const level of data.levels) {
  const ids = level.trickNames.map((name) => trickUuids.get(name)).filter(Boolean);
  lines.push(
    `insert into public.level_tests (level, category, title, pass_condition, trick_ids, source_id) values (${level.level}, ${sql(level.category)}, ${sql(level.title)}, ${sql(level.passCondition)}, array[${ids.map(sql).join(", ")}]::uuid[], ${sql(sourceUuid)}) on conflict (level) do nothing;`
  );
}

for (const [index, relation] of data.relations.entries()) {
  lines.push(
    `insert into public.trick_relations (id, from_trick_id, to_trick_id, type, note, strength) values (${sql(`00000000-0000-4000-a000-${String(index + 1).padStart(12, "0")}`)}, ${sql(trickUuids.get(relation.from))}, ${sql(trickUuids.get(relation.to))}, ${sql(relation.type)}, ${sql(relation.note)}, ${relation.strength}) on conflict (from_trick_id, to_trick_id, type) do nothing;`
  );
}

lines.push("commit;");
const output = `${lines.join("\n")}\n`;
const outIndex = process.argv.indexOf("--out");

if (outIndex >= 0) {
  const outPath = process.argv[outIndex + 1];
  if (!outPath) {
    console.error("--out requires a file path");
    process.exit(1);
  }
  fs.writeFileSync(path.resolve(process.cwd(), outPath), output);
  console.log(`wrote ${outPath}`);
} else {
  console.log(output);
}
