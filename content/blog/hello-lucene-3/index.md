---
title: HelloLucene 使用Lucene搭建简易检索系统——结合Word2vec (3)
date: "2016-09-21T13:15:30Z"
description: "Lucene练习，在hellolucene的基础上，结合Word2vec"
tags:
  - Java
  - "C/C++"
---

基于 `lucene3.5.0` 

```java
package hellolucene;

import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.NumericField;
import org.apache.lucene.index.*;
import org.apache.lucene.queryParser.ParseException;
import org.apache.lucene.queryParser.QueryParser;
import org.apache.lucene.search.*;
import org.apache.lucene.search.BooleanClause.Occur;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.RAMDirectory;
import org.apache.lucene.util.Version;
import org.apache.lucene.queryParser.MultiFieldQueryParser;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashSet;
import java.util.Set;

import java.io.BufferedInputStream;  
import java.io.BufferedReader;  
import java.io.InputStreamReader;  




public class HelloLucene {


	
	public static void main(String[] args) throws IOException, ParseException {
		
		
		System.out.println("正在加载...");
		
		StandardAnalyzer analyzer = new StandardAnalyzer(Version.LUCENE_35);
		Directory index = new RAMDirectory();

		int hitsPerPage = args.length > 1 ? Integer.parseInt(args[1]) : 10;
		String filename = args.length > 0 ? args[0] : "CNKI_journal_v2.txt";
		String binFilename = args.length > 2 ? args[2] : "test.bin";

		IndexWriterConfig config = new IndexWriterConfig(Version.LUCENE_35, analyzer);
		IndexWriter w = new IndexWriter(index, config);

		FileInputStream fis = new FileInputStream(filename);
		InputStreamReader isr = new InputStreamReader(fis, "UTF-8");
		BufferedReader br = new BufferedReader(isr);

		Document doc = null;
		String line = null;
		String field = "";
		String value = "";
		Set<String> fieldnames = new HashSet<String>();
		
		while ((line = br.readLine()) != null) {
			if (!line.substring(0, 1).equals("<")) {
				doc.add(new Field(field, line, Field.Store.YES, Field.Index.ANALYZED));
				continue;
			}

			if (line.equals("<REC>")) {
				if (doc != null)
					w.addDocument(doc);
				doc = new Document();
				continue;
			}
			
			if (line.substring(1,2).equals("年"))	{
				doc.add(new NumericField("年").setIntValue(Integer.parseInt(line.substring(4))));
			}
				
			int i = line.indexOf(">=");
			field = line.substring(1, i);
			value = line.substring(i + 2);
			fieldnames.add(field);

			doc.add(new Field(field, value, Field.Store.YES, Field.Index.ANALYZED));
		}
		w.addDocument(doc);

		br.close();
		w.close();

		System.out.println("加载完成!");

		BufferedReader inbr = new BufferedReader(new InputStreamReader(System.in));
		System.out.print("> ");
		String querystr = inbr.readLine();
		
		

		while (!querystr.equals("exit")) {

			String[] fields = {"题名", "摘要", "关键词", "作者", "单位"};
			String[] stringQuery = new String[fields.length];
			querystr = word2vecQueryStr(querystr, binFilename);
			for (int i = 0; i < 3; i++)
				stringQuery[i] = querystr;

			System.out.print("作者: ");
			String querystring = inbr.readLine();
			stringQuery[3] = querystring.equals("") ? querystr : querystring;
			System.out.print("单位: ");
			querystring = inbr.readLine();
			stringQuery[4] = querystring.equals("") ? querystr : querystring;
			System.out.print("开始年份: ");
			querystring = inbr.readLine();
			querystring = querystring.equals("") ? "0" : querystring;
			int startYear = Integer.parseInt(querystring);
			System.out.print("结束年份: ");
			querystring = inbr.readLine();
			querystring = querystring.equals("") ? "9999" : querystring;
			int endYear = Integer.parseInt(querystring);

			Query q = MultiFieldQueryParser.parse(Version.LUCENE_35, stringQuery, fields, analyzer);

			Query query = NumericRangeQuery.newIntRange("年", startYear, endYear, true, true);
			
			BooleanQuery query2 = new BooleanQuery(); 
			
			query2.add(q, Occur.MUST);
			query2.add(query, Occur.MUST);
			
			IndexSearcher searcher = new IndexSearcher(index, true);
			TopScoreDocCollector collector = TopScoreDocCollector.create(hitsPerPage, true);
			searcher.search(query2, collector);
			ScoreDoc[] hits = collector.topDocs().scoreDocs;

			System.out.println("Found " + hits.length + " hits.");
			for (int i = 0; i < hits.length; ++i) {
				int docId = hits[i].doc;
				Document d = searcher.doc(docId);
				System.out.println((i + 1) + ". " + d.get("题名"));
				System.out.println("作者 : " + d.get("作者"));
				System.out.println("摘要 : " + d.get("摘要"));
				for (String f : fields) {
					if (!f.equals("题名") && !f.equals("作者") && !f.equals("摘要"))
						System.out.println(f + " : " + d.get(f));
				}
				System.out.println("年份： " + d.get("年"));
				System.out.println("-----------------------------");
			}

			searcher.close();

			System.out.print("> ");
			querystr = inbr.readLine();
		}
	}
	
	public static String word2vecQueryStr(String q, String binFilename)	{
        String cmd = "./distance-modify " + binFilename + " " + q;  
        
        Runtime run = Runtime.getRuntime();
        try {  
            Process p = run.exec(cmd);
            BufferedInputStream in = new BufferedInputStream(p.getInputStream());  
            BufferedReader inBr = new BufferedReader(new InputStreamReader(in));  
            String lineStr;  
            while ((lineStr = inBr.readLine()) != null)  
                q += lineStr;
            if (p.waitFor() != 0)	{  
                if (p.exitValue() == 1)
                    System.err.println("命令执行失败!");  
            }  
            inBr.close();  
            in.close();  
        } catch (Exception e) {  
            e.printStackTrace();  
        }  

		return q;
	}
	
}
```

直接利用 word2vec 文件，调用命令行
```
java -jar cnki_lucene_2.jar [CNKI文件的文件名，默认为CNKI_journal_v2.txt] [搜索到的数量上限，默认为10] [使用word2vec生成的bin文件]

java -jar cnki_lucene_2.jar CNKI_journal_v2.txt 10 test.bin
```

修改 word2vec 中的 `distance.c` 代码，使其能从命令行直接查询

```c
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <malloc.h>

const long long max_size = 2000;         // max length of strings
const long long N = 40;                  // number of closest words that will be shown
const long long max_w = 50;              // max length of vocabulary entries

int main(int argc, char **argv) {
  FILE *f;
  char* st1 = argv[2];
  char *bestw[N];
  char file_name[max_size], st[100][max_size];
  float dist, len, bestd[N], vec[max_size];
  long long words, size, a, b, c, d, cn, bi[100];
//  char ch;
  float *M;
  char *vocab;
  if (argc < 2) {
    printf("Usage: ./distance <FILE>\nwhere FILE contains word projections in the BINARY FORMAT\n");
    return 0;
  }
  strcpy(file_name, argv[1]);
  f = fopen(file_name, "rb");
  if (f == NULL) {
    printf("Input file not found\n");
    return -1;
  }
  fscanf(f, "%lld", &words);
  fscanf(f, "%lld", &size);
  vocab = (char *)malloc((long long)words * max_w * sizeof(char));
  for (a = 0; a < N; a++) bestw[a] = (char *)malloc(max_size * sizeof(char));
  M = (float *)malloc((long long)words * (long long)size * sizeof(float));
  if (M == NULL) {
    printf("Cannot allocate memory: %lld MB    %lld  %lld\n", (long long)words * size * sizeof(float) / 1048576, words, size);
    return -1;
  }
  for (b = 0; b < words; b++) {
    a = 0;
    while (1) {
      vocab[b * max_w + a] = fgetc(f);
      if (feof(f) || (vocab[b * max_w + a] == ' ')) break;
      if ((a < max_w) && (vocab[b * max_w + a] != '\n')) a++;
    }
    vocab[b * max_w + a] = 0;
    for (a = 0; a < size; a++) fread(&M[a + b * size], sizeof(float), 1, f);
    len = 0;
    for (a = 0; a < size; a++) len += M[a + b * size] * M[a + b * size];
    len = sqrt(len);
    for (a = 0; a < size; a++) M[a + b * size] /= len;
  }
  fclose(f);
    for (a = 0; a < N; a++) bestd[a] = 0;
    for (a = 0; a < N; a++) bestw[a][0] = 0;
//    printf("Enter word or sentence (EXIT to break): ");
    a = 0;
/*    while (1) {
      st1[a] = fgetc(stdin);
      if ((st1[a] == '\n') || (a >= max_size - 1)) {
        st1[a] = 0;
        break;
      }
      a++;
    } */

    cn = 0;
    b = 0;
    c = 0;
    while (1) {
      st[cn][b] = st1[c];
      b++;
      c++;
      st[cn][b] = 0;
      if (st1[c] == 0) break;
      if (st1[c] == ' ') {
        cn++;
        b = 0;
        c++;
      }
    }
    cn++;
    for (a = 0; a < cn; a++) {
      for (b = 0; b < words; b++) if (!strcmp(&vocab[b * max_w], st[a])) break;
      if (b == words) b = -1;
      bi[a] = b;
//      printf("\nWord: %s  Position in vocabulary: %lld\n", st[a], bi[a]);
      if (b == -1) {
        printf("Out of dictionary word!\n");
        break;
      }
    }
//    printf("\n                                              Word       Cosine distance\n------------------------------------------------------------------------\n");
    for (a = 0; a < size; a++) vec[a] = 0;
    for (b = 0; b < cn; b++) {
      if (bi[b] == -1) continue;
      for (a = 0; a < size; a++) vec[a] += M[a + bi[b] * size];
    }
    len = 0;
    for (a = 0; a < size; a++) len += vec[a] * vec[a];
    len = sqrt(len);
    for (a = 0; a < size; a++) vec[a] /= len;
    for (a = 0; a < N; a++) bestd[a] = -1;
    for (a = 0; a < N; a++) bestw[a][0] = 0;
    for (c = 0; c < words; c++) {
      a = 0;
      for (b = 0; b < cn; b++) if (bi[b] == c) a = 1;
      if (a == 1) continue;
      dist = 0;
      for (a = 0; a < size; a++) dist += vec[a] * M[a + c * size];
      for (a = 0; a < N; a++) {
        if (dist > bestd[a]) {
          for (d = N - 1; d > a; d--) {
            bestd[d] = bestd[d - 1];
            strcpy(bestw[d], bestw[d - 1]);
          }
          bestd[a] = dist;
          strcpy(bestw[a], &vocab[c * max_w]);
          break;
        }
      }
    }
    for (a = 0; a < N; a++) printf("%50s\n", bestw[a]);

  return 0;
}

```


使用该命令编译
```
gcc distance-modify.c -o distance-modify -lm -pthread -O3 -march=native -Wall -funroll-loops -Wno-unused-result
```

其中 test.bin 是word2vec用中文维基训练出来的

没有word2vec的情况下搜 `电脑`

```
正在加载...
加载完成!
> 电脑
作者: 
单位: 
开始年份: 
结束年份: 
Found 10 hits.
1. 电刺激小脑顶核对痉挛型脑瘫患儿移动功能的影响
作者 : 李司南;童光磊;张敏;周陶成;
摘要 : 目的:观察电刺激小脑顶核对于提高痉挛型脑性瘫痪(脑瘫)患儿移动功能的疗效。方法:选择39例(月龄36～60个月)具备独立行走而且踝关节足背屈角偏小的双下肢瘫脑瘫患儿,分为试验组(2l例)和常规治疗组(18例)。试验组进行常规康复训练并添加电刺激小脑顶核;常规治疗组则只采用常规康复训练。共4周,并在治疗前后予以临床痉挛指数(Clinic Spastici-ty Index,CSI)评估、踝关节活动度(ROM)测量以及粗大运动功能量表(GMFM)评分。结果:治疗后,2组患儿CSI分值降低,GM-FM中站(D区)和走跑跳(E区)评分上升,与治疗前相比较,具有明显性差异(P<0.05);踝关节活动度比治疗前明显增大,亦有明显性差异(P<0.01)。试验组的CSI、踝关节活动度和GMFM各项数据表现都比常规治疗组要好,具有明显性差异(P<0.01)。结论:常规康复训练基础上结合电刺激小脑顶核有利于痉挛型脑瘫患儿移动功能的提高。
关键词 : 电刺激小脑顶核;;脑性瘫痪;;痉挛;;移动功能
单位 : 安徽省立儿童医院脑瘫康复中心;
年份： 2012
-----------------------------
2. 电头针治疗脑梗死针刺时机的研究
作者 : 郝跟龙;
摘要 : 目的:观察比较电头针治疗脑梗死不同针刺时机的疗效。方法:按照发病时间分组分为治疗组35例,对照组30例。治疗组在发病2周以内行刺治疗,对照组在发病2~4周行针刺治疗。结果:治疗组治愈率68.6%,对照组43.3%,2组疗效比较P<0.01。结论:电头针治疗脑梗死的疗效在2周以内优于2~4周。
关键词 : 脑梗死;;电头针;;针刺时机
单位 : 安徽省望江县中医头针医院;
年份： 2011
-----------------------------
3. 168例儿童多动症脑电图分析
作者 : 张利容;毛细云;潘辉;欧霞;
摘要 : 目的:探讨脑电图对儿童多动症的诊断价值。方法:对168例小儿多动症患者和100例正常儿童进行脑电图检测,比较其结果。结果:多动症组脑电图异常91例(54.2%),正常组异常23例(23.0%),两者比较有显著性差异。多动症组91例异常病例中,重度异常6例(6.6%),中度异常30例(33.0%),轻度异常45例(49.5%),痫样放电10例(11.0%),正常组23例异常病例中,重度异常1例(4.4%),中度异常2例(8.7%),轻度异常18例(78.3%),痫样放电2例(8.7%),2组比较重度异常和痫样放电无显著性差异,轻度异常和中度异常有显著性差异。结论:脑电图对儿童多动症有一定的诊断价值,但没有特异性。
关键词 : 儿童多动症;;脑电图;;临床调查分析
单位 : 安徽省中医院;
年份： 2011
-----------------------------
4. 电脑在提升林业站财务管理水平中的应用
作者 : 吕美昌;徐礼来;
摘要 : 本文针对新时期林业站财务管理的初级水平与发展现代林业要求极不相适应的状况,着重探索利用电脑提升林业站财务管理水平的问题。实践表明:与传统方式相比,电脑进一步加强了资金和项目管理,确保了资金安全运行,提高了林业站工作效率和服务水平,促进了林业站现代化建设。
关键词 : 电脑;;林业站;;财务管理;;应用
单位 : 旌德县版书乡林业站,旌德县版书乡林业站 安徽旌德242600,安徽旌德242600
年份： 2008
-----------------------------
5. 电针百会、风府穴对脑I/R损伤大鼠海马区CPG15表达的影响
作者 : 唐晓敏;秦正玉;何宗宝;王家琳;吴生兵;汪克明;
摘要 : 目的:探讨电针对局灶性脑缺血再灌注大鼠神经功能的恢复及海马区CPG15表达影响的情况。方法:60只SD大鼠,雌雄各半,随机分为正常对照组、模型组、电针经穴组、电针非经穴组、西药对照组。采用线栓法制备局灶性脑缺血再灌注模型,电针经穴组电针"百会、风府"穴,电针非经穴组电针大鼠臀部非经非穴位置,电针以疏波2Hz,强度3～5mA,持续电针30min,每天1次,连续治疗2周。西药对照组以尼莫地平20mg/(kg.d)灌胃,每日2次,连续灌胃2周。2周后longa5分法对大鼠神经功能缺损评分,并取材,运用免疫组化法检测大鼠缺血侧海马区CPG15表达情况。结果:模型组大鼠神经功能缺损评分及缺血侧海马区CPG15表达显著高于正常对照组,(P<0.01);电针经穴组与西药治疗组大鼠神经功能评分及海马区CPG15表达差异不显著,(P>0.05),而较模型组二者均有显著性差异,(P<0.01);电针非经穴组大鼠神经功能缺损评分及缺血侧海马区CPG15表达与模型组比较差异不明显,(P<0.05)。结论:电针可改善脑缺血再灌注大鼠神经功能并提高海马区CPG15的表达,电针对脑缺血再灌注后脑细胞的神经可塑性有促进作用。
关键词 : 脑缺血再灌注;;电针;;神经功能缺损评分;;CPG15表达;;神经可塑性
单位 : 安徽省合肥市第一人民医院中医针灸科;
年份： 2012
-----------------------------
6. 针刺督脉配合经皮电刺激在脑卒中偏瘫康复中的应用
作者 : 黄学勇;李佩芳;
摘要 : 目的:观察经皮电刺激治疗仪对针刺治疗脑卒中的辅助作用。方法:60例脑卒中以偏瘫为主要临床表现的患者,随机分为2组各30例。治疗组30例采用针刺加低频电刺激的方法,对照组30例单纯采用针刺治疗的方法,2组均以10次为1个疗程,2个疗程进行疗效评定。结果:治疗组在肢体运动功能和日常生活活动能力的改善方面均明显优于对照组(P值均<0.05)。结论:针刺督脉配合经皮电刺激是治疗脑卒中偏瘫行之有效的方法。
关键词 : 脑卒中;;偏瘫;;针刺;;督脉;;经皮电刺激;;肢体运动功能;;日常生活活动能力
单位 : 安徽中医学院附属针灸医院;
年份： 2009
-----------------------------
7. 醒脑治瘫胶囊治疗急性脑梗死52例临床分析
作者 : 陈小转;曲玉强;祁俊;杨雄杰;甘丽;
摘要 : 目的:探讨研究醒脑治瘫胶囊治疗急性脑梗死急性期风火上扰证临床疗效并进行分析。方法:我院2008年7月—2011年6月我科收治的脑梗死急性期风火上扰证患者101例。随机分为治疗组52例,对照组49例,治疗组在对照组治疗基础上加用醒脑治瘫胶囊,观察临床疗效并对比。结果:治疗组与对照组治疗后神经功能缺损评分比较P<0.05,有明显差异性;2组治疗后有效率经统计学分析(P<0.05)有显著差异性。结论:醒脑治瘫胶囊配合西药能够明显改善脑梗死急性期风火上扰证患者神经功能缺损症状,缩短病程,提高治愈率,减少致残率且安全无副作用,值得广泛推广。
关键词 : 醒脑治瘫;;急性脑梗死;;急性期;;风火上扰证
单位 : 安徽省芜湖市中医院脑病科;
年份： 2011
-----------------------------
8. 脑与脾胃相关病机理论探析
作者 : 王玮;杨文明;王晓旸;
摘要 : 脑为元神之府,脑主神明,脾胃为后天之本,气血生化之源。该文主要通过脑与脾胃的在生理上相互联系,病理上相互影响来阐述脑与脾胃的关系,同时结合历代医家从脾胃论治脑病以及从脑来论治脾胃等研究成果来阐明脑与脾胃的病机理论。
关键词 : 脑;;脾胃;;病机理论
单位 : 安徽中医学院;安徽中医学院第一附属医院脑病中心;
年份： 2012
-----------------------------
9. 20kV供电方案的应用
作者 : 黄长杰;
摘要 : 文章介绍了110/20kV变电站电气设计的主要内容,并结合具体应用进行经济技术比较分析,得出了20kV供电方案应用的优点。
关键词 : 供电方案;;电气设计;;配电装置
单位 : 合肥供电公司;
年份： 2009
-----------------------------
10. 胰岛素抵抗与缺血性脑卒中的相关性
作者 : 陈小转;李庆利;
摘要 : 缺血性脑卒中作为临床常见病、多发病已受到广泛重视。近年来,胰岛素抵抗作为脑梗死的独立危险因素,国内外许多学者对胰岛素抵抗与脑梗死的关系进行了探讨。本文就缺血性脑卒中与IR相关性加以概述。
关键词 : 胰岛素抵抗;;缺血性脑卒中
单位 : 安徽省芜湖市中医院脑病科;
年份： 2012
-----------------------------
> exit

```

采用进行检索时进行处理的方式，我的实现方法比较粗暴，就是调用命令行查找近义词，然后一起放到查询中进行查找

加入word2vec之后

```
正在加载...
加载完成!
> 电脑
作者: 
单位: 
开始年份: 
结束年份: 
Found 10 hits.
1. 计算机与机电一体化
作者 : 温淑玲
摘要 : 电子技术的发展产生了计算机，而计算机技术又带动了整个高技术群体飞速发展，引起了传统机械工业的技术革命──机电一体化。
关键词 : 计算机;;机电一体化;;自动控制
单位 : 合肥电力学校
年份： 1999
-----------------------------
2. 乌江抽水站电气设备改造
作者 : 刘长义
摘要 : 乌江抽水站作为驷马山引江灌溉工程的渠首泵站,在抗旱保产中具有重要作用。本文介绍抽水站电气设备改造及采用的计算机监控系统的特点。
关键词 : 驷马山灌区;;乌江抽水站;;电气;;计算机监控系统
单位 : 安徽省水利水电勘测设计院
年份： 2003
-----------------------------
3. 一个面向计算机基础CAI的软件研究
作者 : 黄晓梅，张霖
摘要 : 给出了一个面向计算机基础教学的软件设计思想及教学流程、系统结构及各功能模块的设计方法。
关键词 : 计算机辅助教学，个别化教学模式，软件重用技术
单位 : 安徽建筑工业学院计算机工程系
年份： 1996
-----------------------------
4. 并行处理与并行计算机
作者 : 梁兴琦,欧阳一鸣
摘要 : 阐述了并行计算机的结构和原理，分析了并行处理的主要技术，指出了开发并行处理技术和并行计算机的重要性。
关键词 : 并行处理，并行计算机，操作系统
单位 : 安徽经济管理学院,合肥工业大学
年份： 1999
-----------------------------
5. 农业院校非计算机专业计算机基础教学改革研究与实践
作者 : 张武;陈鸣;朱诚;
摘要 : 分析了目前农业院校非计算机专业计算机基础课程教学中普遍存在的一些问题,如学生基础差异较大、课程设置与专业结合不紧密、教学方法陈旧、理论课程与实验课相互脱节等,从以下几个方面介绍了安徽农业大学计算机基础教学改革实践:课程体系建设;个性化与差异化教学;改革课程的教学模式及方法;教材建设;改革课程的考核方式;开放教学资源,提高学生自学能力。计算机基础教学改革取得了良好的效果,为培养既精通专业知识,又掌握计算机应用技能的复合型人才奠定了基础。
关键词 : 计算机基础;;课程体系;;层次教学;;教学方法
单位 : 安徽农业大学信息与计算机学院;合肥工业大学外国语学院;
年份： 2011
-----------------------------
6. 我国会计电算化的现状与展望
作者 : 潘琳;
摘要 : 随着国民经济的发展和会计改革的深入,原有的会计手 工模式越来越不能满足需要,会计电算化系统应运而生,然而会计电 算化在改变传统繁琐的手工记帐的同时,也暴露出了诸多的新问题。 本文就如何解决我国会计电算化存在的问题和如何促进我国会计电 算化的发展进行探讨。
关键词 : 会计电算化;;会计信息
单位 : 安徽建工集团审计监察室 安徽 合肥 230001
年份： 2005
-----------------------------
7. 电动汽车车载微机测试系统的研究
作者 : 阚海涛;
摘要 : 本文在国家初步制定了电动汽车检测标准的基础上,对电动汽车车载微机测试系统进行了研究与设计。本文设计的测试系统侧重于动力参数性能测试和蓄电池运行参数测试两部分,优化了测量方法和程序算法,精选了适合微机系统的数据采集卡,大大提高了数据采集测量的精度和处理计算的速度,并采用功能强大的组态软件PCauto3.1开发了生动、逼真,可视化效果好的测试界面。
关键词 : 动力参数;;蓄电池;;数据采集;;测试系统
单位 :  中国电子科技集团公司第三十八研究所,
年份： 2006
-----------------------------
8. 电子政务下我国公共危机治理系统探究
作者 : 梁俊山;
摘要 : 电子政务和公共危机治理是现代社会新形势下的新产物,电子政务公共危机治理系统的构建有着重大的理论价值和现实意义。通过对电子政务危机治理系统的探究,确立了构建电子政务公共危机治理系统的基本模型,并结合实际分析了我国建立该系统应当具备的条件和应当注意的问题。
关键词 : 电子政务;;公共危机;;治理;;系统
单位 : 忻州师范学院政史系;
年份： 2010
-----------------------------
9. 谈计算机技术与建筑的关系
作者 : 林晨;
摘要 : 从建筑画的发展谈起,阐述了计算机辅助建筑设计的发展及其在建筑画表达方面的巨大影响和不足之处。并结合全球能源紧缺的现实,论述了计算机技术在建筑能耗模拟和工况运行监测等新领域的应用情况。
关键词 : 建筑画;;计算机辅助设计;;建筑节能
单位 : 山东工艺美术学院建筑与景观设计学院;
年份： 2009
-----------------------------
10. 电头针治疗脑梗死针刺时机的研究
作者 : 郝跟龙;
摘要 : 目的:观察比较电头针治疗脑梗死不同针刺时机的疗效。方法:按照发病时间分组分为治疗组35例,对照组30例。治疗组在发病2周以内行刺治疗,对照组在发病2~4周行针刺治疗。结果:治疗组治愈率68.6%,对照组43.3%,2组疗效比较P<0.01。结论:电头针治疗脑梗死的疗效在2周以内优于2~4周。
关键词 : 脑梗死;;电头针;;针刺时机
单位 : 安徽省望江县中医头针医院;
年份： 2011
-----------------------------
> exit
```
可以明显看出查询准确率有所提升。