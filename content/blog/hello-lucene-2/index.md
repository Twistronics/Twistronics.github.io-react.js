---
title: HelloLucene 使用Lucene搭建简易检索系统——多域检索 (2)
date: "2016-09-19T13:15:30Z"
description: "在hellolucene的基础上实现多域检索"
tags:
  - Java
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

public class HelloLucene {

	public static void main(String[] args) throws IOException, ParseException {
		
		System.out.println("正在加载...");
		
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
}
```

直接用 java 运行，以`cnki_lucene_1.jar`为例
``` 
java -jar cnki_lucene_1.jar
```

有两个参数可选

```
java -jar cnki_lucene_1.jar [CNKI文件的文件名，默认为CNKI_journal_v2.txt] [搜索到的数量上限，默认为10]

java -jar cnki_lucene_1.jar CNKI_journal_v2.txt 10
```

初始化成功后，直接输入就可以查询，输入 exit 退出

## 多域检索

直接在命令行中运行
```
java -jar cnki_lucene_1.jar CNKI_journal_v2.txt 10
```

加载大约30秒

* 普通检索

```
正在加载...
加载完成!
> 基坑
作者: 
单位: 
开始年份: 
结束年份: 
Found 10 hits.
1. 大预应力锚杆+肋梁支护结构替代桩锚支护结构在潍坊市区超大深基坑工程中应用
作者 : 贾绪富;毛宝江;万元杰;李勇基;
摘要 : 潍坊市区深基坑开挖涉及的土层以粉土、粉砂为主,地下水位以上用土钉墙支护是一种成功的方法,但当周边环境对基坑位移和沉降要求严格时,土钉墙仅能控制位移在3‰H之内,在这种情况下,只能采用造价较高的桩锚支护。文章结合潍坊市十笏园文化街区项目基坑支护工程的实际情况,介绍一种可以替代桩锚支护结构的支护技术,供同行们选择支护方案时参考。
关键词 : 预应力锚杆肋梁支护结构;;桩锚支护结构;;基坑工程
单位 : 青岛深基加固工程有限公司;中国建筑第八工程局有限公司青岛分公司;
年份： 2011
-----------------------------
2. 浅谈深基坑支护工程事故及预防
作者 : 上官士青;秦骞;
摘要 : 文章通过收集总结国内专家学者对深基坑事故的统计数据,探讨了深基坑支护工程事故的原因及施工过程中存在的问题,并简要介绍了深基坑支护工程事故预防的方法。
关键词 : 深基坑;;基坑支护;;工程事故;;预防
单位 : 中国矿业大学资源与地球科学学院;
年份： 2009
-----------------------------
3. 勘察基坑支护施工事故成因的分析
作者 : 张玉林;
摘要 : 根据目前建筑施工中基坑施工工作的现状,以及勘察、设计、管理、施工等各方面因素,针对实际个案中出现的基坑施工事故,分析事故的发生原因,确定防止基坑施工事故的方法及措施。
关键词 : 建筑基坑;;基坑支护;;施工事故;;预防措施
单位 : 安徽建工第四工程有限公司;
年份： 2010
-----------------------------
4. 地下水对基坑的稳定性影响分析
作者 : 杨慧丰
摘要 : 在软弱地层深基坑开挖过程中,地下水位对基坑的稳定性具有决定性的作用,本文通过工程施工实例就承压水对基坑开挖的稳定性影响进行分析和探讨。
关键词 : 地下水;;基坑;;稳定性
单位 : 中铁四局集团公司 安徽合肥230022
年份： 2004
-----------------------------
5. 新天地商贸大厦深基坑支护工程之实践
作者 : 黄超;乔以东;
摘要 : 文章结合淮南市新天地商贸大厦深基坑支护方案,对该场地的工程地质、水文地质条件行了分析,以岩土工程勘察资料为基础,在场地条件受限制情况下,提出了较为合理的支护形式,分析了该深基坑施工的技术要点,并在施工过程中进行了基坑的位移观测。通过监测结果分析,表明该深基坑支护方案是可行的。最后对深基坑支护提出了较合理的建议。
关键词 : 深基坑支护;;桩锚方案;;基坑监测
单位 : 淮南市大纬房地产开发有限公司;淮南市房开建筑安装工程有限责任公司;
年份： 2010
-----------------------------
6. 软土地区深基坑支护事故原因分析及防范对策
作者 : 吴前昌;
摘要 : 针对软土地区深基坑工程特点,对深基坑支护事故原因进行分析,并从施工质量管理、避免设计缺陷两个主要方面提出防范对策。
关键词 : 深基坑;;基坑支护;;安全管理
单位 : 江苏龙坤建设工程有限公司;
年份： 2012
-----------------------------
7. 基坑维护结构施工及其应急预案
作者 : 丁思刚;
摘要 : 文章着重介绍基坑围护结构施工工艺,同时介绍了在围护结构施工过程中,基坑开挖过程可能会发生的质量事故的原因以及防止质量事故发生的应急预案。
关键词 : 基坑;;施工;;应急预案
单位 : 中铁四局集团第八工程有限公司 安徽 合肥 230023
年份： 2006
-----------------------------
8. 某地铁车站基坑对临近基坑的影响分析
作者 : 刘欣;
摘要 : 随着地铁工程建设的大规模发展,在地铁工程建设的过程中,地铁车站与临近建筑物的连接越来越多,从而引起两者间的距离也越来越近。文章以某地铁车站基坑为例,对地铁车站基坑的开挖工况进行模拟计算,分析其对临近基坑产生的影响,从而得出结论,为地铁车站围护结构的设计提供参考。
关键词 : 地铁车站;;深基坑;;相互影响;;有限元分析
单位 : 广州地铁设计研究院有限公司;
年份： 2010
-----------------------------
9. 常熟恒隆中心超深基坑组合支护的施工
作者 : 陈卫红;
摘要 : 一般深基坑支护的施工工艺方法比较成熟,但超深基坑的支护施工,仍是工程技术人员继续研究探寻的课题。目前,一般土层中超深基坑的支护设计普遍采用较保守的结构方案,正是在这种多道设防指导思想下设计出的图纸,给施工带来了一定的难度。文章就常熟恒隆中心超深基坑支护的成功施工案例,对复合支护施工技术做一些探讨。
关键词 : 超深基坑;;水泥搅拌桩;;基坑支护;;施工工艺
单位 : 江苏广播电视大学;
年份： 2010
-----------------------------
10. 基坑工程中渗透破坏分析与控制研究
作者 : 申锦华;陶西贵;
摘要 : 分析了基坑工程降水中渗透破坏发生机理及影响其发生的条件,指出在基坑设计与施工中控制渗透破坏的有效措施,并在实际工程中应用,取得较好的效果,为深基坑降水和相关研究提供参考。
关键词 : 基坑工程;;渗透破坏;;分析;;控制
单位 : 沪智机电工程(上海)有限公司;工程兵指挥学院;
年份： 2010
-----------------------------
```

* 通过作者或者单位进行检索

```
> 基坑
作者: 陶西贵
单位: 上海
开始年份: 
结束年份: 
Found 10 hits.
1. 基坑工程中渗透破坏分析与控制研究
作者 : 申锦华;陶西贵;
摘要 : 分析了基坑工程降水中渗透破坏发生机理及影响其发生的条件,指出在基坑设计与施工中控制渗透破坏的有效措施,并在实际工程中应用,取得较好的效果,为深基坑降水和相关研究提供参考。
关键词 : 基坑工程;;渗透破坏;;分析;;控制
单位 : 沪智机电工程(上海)有限公司;工程兵指挥学院;
年份： 2010
-----------------------------
2. 浅议深基坑大底板砼施工
作者 : 徐泓,蔡洁
摘要 : 深基坑大底板混凝土的浇筑及养护
关键词 : 隐蔽工程;;砼底板;;深基坑;;支持系统;;坍落度;;泌水;;有害裂缝;;砼养护
单位 : 上海市电力公司
年份： 2002
-----------------------------
3. 深基坑支护技术的现状分析
作者 : 陶宁生;
摘要 : 随着高层建筑的发展,对深基坑支护的要求也越来越高,文章通过对深基坑支护类型的总结,提出了深基坑工程支护技术当前存在的一些问题。
关键词 : 深基坑工程;;支护类型;;施工监测;;工程监理
单位 : 安徽省公益性项目建设管理中心;
年份： 2009
-----------------------------
4. 基坑施工引起地表沉降分析及邻近建筑保护措施
作者 : 蒋锋平;蒋震海;
摘要 : 以连云港机场国际候机楼基坑开挖施工为工程背景,运用时空效应原理方法开挖,减小了基坑施工引起的地表沉降,有效地保护了邻近建筑,以期为类似基坑施工引起邻近建筑保护提供参考价值。
关键词 : 基坑;;地表沉降;;邻近建筑物;;时空效应
单位 : 上海民航新时代机场设计研究院有限公司;连云港民航站;
年份： 2011
-----------------------------
5. 浅谈深基坑支护工程事故及预防
作者 : 上官士青;秦骞;
摘要 : 文章通过收集总结国内专家学者对深基坑事故的统计数据,探讨了深基坑支护工程事故的原因及施工过程中存在的问题,并简要介绍了深基坑支护工程事故预防的方法。
关键词 : 深基坑;;基坑支护;;工程事故;;预防
单位 : 中国矿业大学资源与地球科学学院;
年份： 2009
-----------------------------
6. 勘察基坑支护施工事故成因的分析
作者 : 张玉林;
摘要 : 根据目前建筑施工中基坑施工工作的现状,以及勘察、设计、管理、施工等各方面因素,针对实际个案中出现的基坑施工事故,分析事故的发生原因,确定防止基坑施工事故的方法及措施。
关键词 : 建筑基坑;;基坑支护;;施工事故;;预防措施
单位 : 安徽建工第四工程有限公司;
年份： 2010
-----------------------------
7. 地下水对基坑的稳定性影响分析
作者 : 杨慧丰
摘要 : 在软弱地层深基坑开挖过程中,地下水位对基坑的稳定性具有决定性的作用,本文通过工程施工实例就承压水对基坑开挖的稳定性影响进行分析和探讨。
关键词 : 地下水;;基坑;;稳定性
单位 : 中铁四局集团公司 安徽合肥230022
年份： 2004
-----------------------------
8. 新天地商贸大厦深基坑支护工程之实践
作者 : 黄超;乔以东;
摘要 : 文章结合淮南市新天地商贸大厦深基坑支护方案,对该场地的工程地质、水文地质条件行了分析,以岩土工程勘察资料为基础,在场地条件受限制情况下,提出了较为合理的支护形式,分析了该深基坑施工的技术要点,并在施工过程中进行了基坑的位移观测。通过监测结果分析,表明该深基坑支护方案是可行的。最后对深基坑支护提出了较合理的建议。
关键词 : 深基坑支护;;桩锚方案;;基坑监测
单位 : 淮南市大纬房地产开发有限公司;淮南市房开建筑安装工程有限责任公司;
年份： 2010
-----------------------------
9. 软土地区深基坑支护事故原因分析及防范对策
作者 : 吴前昌;
摘要 : 针对软土地区深基坑工程特点,对深基坑支护事故原因进行分析,并从施工质量管理、避免设计缺陷两个主要方面提出防范对策。
关键词 : 深基坑;;基坑支护;;安全管理
单位 : 江苏龙坤建设工程有限公司;
年份： 2012
-----------------------------
10. 基坑维护结构施工及其应急预案
作者 : 丁思刚;
摘要 : 文章着重介绍基坑围护结构施工工艺,同时介绍了在围护结构施工过程中,基坑开挖过程可能会发生的质量事故的原因以及防止质量事故发生的应急预案。
关键词 : 基坑;;施工;;应急预案
单位 : 中铁四局集团第八工程有限公司 安徽 合肥 230023
年份： 2006
-----------------------------
```

* 对年份进行限制

```
> 基坑
作者: 
单位: 
开始年份: 2011
结束年份: 2012
Found 10 hits.
1. 大预应力锚杆+肋梁支护结构替代桩锚支护结构在潍坊市区超大深基坑工程中应用
作者 : 贾绪富;毛宝江;万元杰;李勇基;
摘要 : 潍坊市区深基坑开挖涉及的土层以粉土、粉砂为主,地下水位以上用土钉墙支护是一种成功的方法,但当周边环境对基坑位移和沉降要求严格时,土钉墙仅能控制位移在3‰H之内,在这种情况下,只能采用造价较高的桩锚支护。文章结合潍坊市十笏园文化街区项目基坑支护工程的实际情况,介绍一种可以替代桩锚支护结构的支护技术,供同行们选择支护方案时参考。
关键词 : 预应力锚杆肋梁支护结构;;桩锚支护结构;;基坑工程
单位 : 青岛深基加固工程有限公司;中国建筑第八工程局有限公司青岛分公司;
年份： 2011
-----------------------------
2. 软土地区深基坑支护事故原因分析及防范对策
作者 : 吴前昌;
摘要 : 针对软土地区深基坑工程特点,对深基坑支护事故原因进行分析,并从施工质量管理、避免设计缺陷两个主要方面提出防范对策。
关键词 : 深基坑;;基坑支护;;安全管理
单位 : 江苏龙坤建设工程有限公司;
年份： 2012
-----------------------------
3. 上海某基坑工程的设计与分析
作者 : 黄春美;
摘要 : 以上海某基坑工程为例,针对面积大、深度深、地质条件差等特点,通过选型分析给出了该基坑的支护设计方案,分析了常用板式支护体系和内支撑的工程应用特点。对整个围护结构进行了有限元分析,计算表明整个基坑工程可以较好的保护环境,为同类工程提供了参考。
关键词 : 深基坑;;钻孔灌注桩;;有限元分析
单位 : 同济大学土木工程学院;
年份： 2012
-----------------------------
4. 利用ObjectARX开发基于AutoCAD的基坑工程参数化绘图系统
作者 : 袁博;
摘要 : 根据基坑支护结构设计的特点,采用面向对象的软件开发技术,利用ObjectARX开发了基于AutoCAD绘图软件的基坑工程参数化绘图系统。文章主要阐述了该系统的功能分析、总体结构及主要实现技术,并通过对一些以往工程案例中基坑支护结构施工图的绘制,验证了系统的实用性。
关键词 : ObjectARX;;基坑工程;;AutoCAD二次开发;;参数化绘图
单位 : 同济大学土木工程学院;
年份： 2012
-----------------------------
5. 高压旋喷桩在某基坑工程中的应用
作者 : 王健;
摘要 : 通过某深基坑支护工程实例,对该工程场地的地质及水文情况进行了详细的介绍,并对该工程高压旋喷桩止水帷幕的施工方法及控制要点进行了较详尽的介绍,为今后同类型基坑工程施工提供经验。
关键词 : 基坑;;止水帷幕;;高压旋喷桩
单位 : 河北建设勘察研究院有限公司;
年份： 2011
-----------------------------
6. 搅拌桩和降水井在深基坑工程中的应用
作者 : 曹明艳;
摘要 : 搅拌桩和降水井是深基坑工程中的常用施工技术,这两种方法可单独或同时应用于基坑工程中,文章从实例出发,谈谈如何灵活应用这两种技术。
关键词 : 搅拌桩;;降水井;;深基坑工程
单位 : 安徽五建建设工程集团有限公司;
年份： 2012
-----------------------------
7. 天津奈伦国贸大厦深基坑支护工程变形监测研究
作者 : 蓝树猛;张毅;李飞;
摘要 : 天津奈伦国贸大厦基坑属于深基坑工程,开挖深度和面积均较大。文章详细介绍了该基坑支护工程的监测方案,并从基坑底部隆起变形、基坑外围水位变化以及支护结构水平位移变化值进行分析。目前的监测结果表明,该基坑支护较为安全可靠,但基坑外围的水位变化情况需引起重视。
关键词 : 深基坑;;开挖;;支护;;变形监测
单位 : 黄河勘测规划设计有限公司;
年份： 2011
-----------------------------
8. 基坑施工引起地表沉降分析及邻近建筑保护措施
作者 : 蒋锋平;蒋震海;
摘要 : 以连云港机场国际候机楼基坑开挖施工为工程背景,运用时空效应原理方法开挖,减小了基坑施工引起的地表沉降,有效地保护了邻近建筑,以期为类似基坑施工引起邻近建筑保护提供参考价值。
关键词 : 基坑;;地表沉降;;邻近建筑物;;时空效应
单位 : 上海民航新时代机场设计研究院有限公司;连云港民航站;
年份： 2011
-----------------------------
9. 某深基坑工程监测实例分析
作者 : 李光;王国体;
摘要 : 通过对某深基坑支护结构的顶端沉降、深层水平位移、支承轴力的监测,探讨了沉降的变化规律与变形特性。监测分析结果表明:顶端沉降随开挖时间的递增而增大,增长速度前慢后快;深层水平位移大小及分布与基坑开挖深度、支护结构等因素有关;支承轴力是随时间,在开挖时先变大、后有小的趋势。由监测结果可知,该基坑工程支护结构的变形控制设计方案合理,效果良好,满足了设计和环境的要求。
关键词 : 深基坑;;水平位移;;沉降;;监测;;变形
单位 : 合肥工业大学土木与水利工程学院;
年份： 2012
-----------------------------
10. 基坑降水及综合措施在安徽颍上县耿楼枢纽工程中的应用
作者 : 何俊;陈方葵;
摘要 : 本文以安徽颍上县耿楼枢纽工程基坑降水为例,采用深井降水与轻型井点降水相结合的综合方案,降水效果好,确保了基坑和基础工程施工的顺利进行。
关键词 : 基坑;;透水层;;深井降水;;轻型井点
单位 : 安徽水利水电职业技术学院;
年份： 2012
-----------------------------
> exit
```