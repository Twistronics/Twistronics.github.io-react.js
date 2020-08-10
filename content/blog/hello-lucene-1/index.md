---
title: HelloLucene 使用Lucene搭建简易检索系统 (1)
date: "2016-09-14T13:15:30Z"
description: "Lucene练习，基于lucene3.5.0，使用Lucene的简易检索代码。"
tags:
  - Java
  - "Information retrieval"
---

基于 `lucene3.5.0` 

```java
package hellolucene;

import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.index.*;
import org.apache.lucene.queryParser.ParseException;
import org.apache.lucene.queryParser.QueryParser;
import org.apache.lucene.search.*;
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

public class HelloLucene {

	public static void main(String[] args) throws IOException, ParseException {
		StandardAnalyzer analyzer = new StandardAnalyzer(Version.LUCENE_35);
		Directory index = new RAMDirectory();

		int hitsPerPage = args.length > 1 ? Integer.parseInt(args[1]) : 10;
		String filename = args.length > 0 ? args[0] : "CNKI_journal_v2.txt";

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

			int i = line.indexOf(">=");
			field = line.substring(1, i);
			value = line.substring(i + 2);
			fieldnames.add(field);

			doc.add(new Field(field, value, Field.Store.YES, Field.Index.ANALYZED));
		}
		w.addDocument(doc);

		br.close();
		w.close();

		BufferedReader inbr = new BufferedReader(new InputStreamReader(System.in));
		System.out.print("> ");
		String querystr = inbr.readLine();

		while (!querystr.equals("exit")) {

			String[] fields = fieldnames.toArray(new String[fieldnames.size()]);
			String[] stringQuery = new String[fieldnames.size()];
			for (int i = 0; i < fieldnames.size(); i++)
				stringQuery[i] = querystr;

			Query q = MultiFieldQueryParser.parse(Version.LUCENE_35, stringQuery, fields, analyzer);

			IndexSearcher searcher = new IndexSearcher(index, true);
			TopScoreDocCollector collector = TopScoreDocCollector.create(hitsPerPage, true);
			searcher.search(q, collector);
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
				System.out.println("-----------------------------");
			}

			searcher.close();

			System.out.print("> ");
			querystr = inbr.readLine();
		}
	}
}
```

直接用 java 运行，以`cnki_lucene_standard_analyzer.jar`为例
```
java -jar cnki_lucene_standard_analyzer.jar
```

有两个参数可选

```
java -jar cnki_lucene_standard_analyzer.jar [CNKI文件的文件名，默认为CNKI_journal_v2.txt] [搜索到的数量上限，默认为10]

java -jar cnki_lucene_standard_analyzer.jar CNKI_journal_v2.txt 10
```

初始化成功后，直接输入就可以查询，输入 exit 退出
```
> 机器学习
Found 10 hits.
1. 基于LS-SVM的采摘机器人运动变结构控制
作者 : 焦俊;
摘要 : 为了提高采摘机器人控制的精度,提出了一种基于支持向量机的变结构控制方法。利用支持向量机在线调整变结构控制律中的控制参数,克服了常规变结构控制方法中需预先设定趋近律参数的限制,既保留了传统趋近律的优点,又有效的改善了系统的控制品质,消除了系统抖振,使系统最终以理想方式在滑模面上运动,理论分析和仿真结果表明了所提出方法的有效性。
英文关键词 : Variable structure control;discrete reaching law;Least Square-Support vector machine(LS-SVM)
来源 : 安徽农学通报
英文篇名 : Automatic Guided Vehicle Variable Structure Control Based Least Square-Support Vector Machine
英文摘要 : In order to advance picking robot control,A variable structure control method based on least square-support vector machine(LS-SVM) was proposed.Parameters,which were determined previously in the conventional reaching law,were regulated adaptively by LS-SVM.It is shown that all advantages of conventional reaching law are retained,meanwhile the control features of the control system are improved effectively and system chattering is eliminated.System can move perfectly on the sliding-mode surface.Theoretic analysis and simulation results prove the validity of the method.

...

第一责任人 : 焦俊;
专题名称 : 机器人技术;
年 : 2008
英文刊名 : Anhui Agricultural Science Bulletin
-----------------------------
2. 高校构建学习实践科学发展观长效机制的基本要求
作者 : 梁祥凤;
摘要 : 高校要构建学习实践科学发展观长效机制,应该着力完善高校发展的价值取向,建立正确的价值评价体系;同时,在中国特色社会主义理论体系教学中突出科学发展观;最后,在科学发展观教育实践中,处理好矛盾的普遍性和特殊性的关系。
英文篇名 : On the Basic Requirements of Constructing Long-Term Mechanism for Studying and Practicing the Scientific Outlook on Development at Colleges
英文摘要 : To construct long-term mechanism for studying and practicing the scientific outlook on development,universities should first strive to optimize its value orientation and establish the correct value evaluation system,to stress the scientific outlook on development in the teaching of the theories of socialism with Chinese characteristics at the same time,and to handle appropriately the relation between universality and particularity of contradictions in the teaching of the outlook.

...

-----------------------------

> exit

```
