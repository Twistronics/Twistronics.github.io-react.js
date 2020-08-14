---
title: "路由协议RIP的简单实现"
date: "2014-03-07T13:15:30Z"
description: "充分理解RIP（ Routing Information Protocol）协议，IP协议的报文处理和超时处理函数，并实现如下功能：RIP报文有效性检查；处理Req，根据RIP协议的流程设计Ruest报文；处理Response报文；路由表项超时删除；路由表项定时发送。"
tags: 
  - "C/C++"
  - "TCP/IP"
---

RIP（ Routing Information Protocol） 协议是一种域内的路由协议。其特点是：运行开销小、简单、范围广。
二十世纪八十年代，加州大学伯克利分校在开发Unix系统时，在路由守护进程routed程序中设计实现了RIP协议软件。 routed程序被绑定在BSD Unix系统中一起推出。随着Unix操作系统的普及， RIP/routed也逐渐被推广，被广泛的应用于早期网络中网络结点之间交换路由信息，成为了中小型网络中最基本的路由协议/软件。

每个报文都包括一个报文命令字段、 一个报文版本字段以及一些路由信息项（ 一个RIP 报文中最多允许25个路由信息项） 。 RIP 报文的最大长度为4+20*25=504字节， 加上UDP 报头的8字节， 一共是512 字节。
* Command 字段：表示RIP 报文的类型， 目前RIP 只支持两种报文类型， 分别是请求报文（ request） 和响应（ response） 报文。
* Version 字段：表示RIP 报文的版本信息， RIPv1 报文中此字段为1。
* Address Family Identifier 字段：表示路由信息所属的地址族， 目前RIP 中规定此字段必须为2， 表示使用IP 地址族。
* IPv4 Address 字段：表示路由信息对应的目的地IP 地址， 可以是网络地址、 子网地址以及主机地址。
* Metric 字段：表示从本路由器到达目的地的距离， 目前RIP 将路由路径上经过的路由器数作为距离度量值。

####要求
1. 对客户端接收到的RIP报文进行有效性检查：对客户端接收到的RIP协议报文进行合法性检查，丢弃存在错误的报文并指出错误原因；
2. 处理Request报文：正确解析并处理RIP协议的Request报文，并能够根据报文的内容以及本地路由表组成相应的Response报文，回复给Request报文的发送者，并实现水平分割； 处理Response报文：正确解析并处理RIP协议的Response报文，并根据报文中携带的路由信息更新本地路由表；
3. 路由表项超时删除：处理来自系统的路由表项超时消息，并能够删除指定的路由；
4. 路由表项定时发送：实现对本地路由的定时发送功能，并实现水平分割。
5. 客户端软件模拟一个网络中的路由器，在其中两个接口运行RIP协议，接口编号为1和2，每个接口均与其他路由器连接，通过RIP协议交互路由信息。


`rip.cpp`
```cpp
#include "sysinclude.h"

extern void rip_sendIpPkt(unsigned char *pData, UINT16 len, unsigned short dstPort, UINT8 iNo);

extern struct stud_rip_route_node *g_rip_route_table;

void send_response_rip_packet(UINT8 iNo) 
{
	RipPacket rp;		
	rp.rip_vers = 2;
	rp.rip_cmd = 2;
	rp.rip_mbz = 0;

	int count = 0;
	for (stud_rip_route_node* n = g_rip_route_table; n != NULL; n = n->next)
	{
		if (n->if_no != iNo) {
			RipRt* now = &rp.rip_rts[count];
			now->rr_rttag = 0;
			now->rr_family = htons(2);
			now->rr_addr.u_l = htonl(n->dest);
			now->rr_mask.u_l = htonl(n->mask);
			now->rr_nexthop.u_l = htonl(n->nexthop);
			now->rr_metric = htonl(n->metric);
			count++;
		}
	}
	rip_sendIpPkt((unsigned char*)&rp, 4 + 20 * count, 520, iNo);
}

stud_rip_route_node* find_route_node(unsigned int dest, unsigned int mask)
{
	for (stud_rip_route_node* n = g_rip_route_table; n != NULL; n = n->next)
		if (n->dest == dest && n->mask == mask)
			return n;
	
	return NULL;
}

int stud_rip_packet_recv(char *pBuffer, int bufferSize, UINT8 iNo, UINT32 srcAdd)
{
	RipPacket* rp = (RipPacket*)pBuffer;
	if (rp->rip_vers != 2) {
		ip_DiscardPkt(pBuffer, STUD_RIP_TEST_VERSION_ERROR);
		return 0;
	}

	switch (rp->rip_cmd) {
	case 1:
		send_response_rip_packet(iNo);
		break;

	case 2:
		for (int i = 0; i < RIP_MAX_ROUTES; i++) {
			RipRt* rr = &(rp->rip_rts[i]);
			if (rr->rr_addr.u_l == 0) 
				break;
			
			stud_rip_route_node* nd = find_route_node(ntohl(rr->rr_addr.u_l), ntohl(rr->rr_mask.u_l));
			if (nd != NULL) {
				if (nd->nexthop == srcAdd || ntohl(rr->rr_metric) + 1 < nd->metric) {
					nd->if_no = iNo;
					nd->nexthop = srcAdd;
					nd->metric = ntohl(rr->rr_metric) + 1;
				}
			} else {
				nd = new stud_rip_route_node;
				nd->dest = htonl(rr->rr_addr.u_l);
				nd->mask = htonl(rr->rr_mask.u_l);
				nd->metric = htonl(rr->rr_metric) + 1;
				nd->nexthop = srcAdd;
				nd->if_no = iNo;
				nd->next = g_rip_route_table;
				g_rip_route_table = nd;
			}
		}
		break;

	default:
		ip_DiscardPkt(pBuffer, STUD_RIP_TEST_COMMAND_ERROR);
		break;
	}
	return 0;
}


#define MAXINO 2
void stud_rip_route_timeout(UINT32 destAdd, UINT32 mask, unsigned char msgType)
{
	switch (msgType)
	{
	case  RIP_MSG_SEND_ROUTE:
		for (int i = 1; i <= MAXINO; i++)
			send_response_rip_packet(i);
		break;

	case RIP_MSG_DELE_ROUTE:
		stud_rip_route_node* nd = find_route_node(destAdd, mask);
		if (nd != NULL)
			nd->metric = 16;
		break;
	}
}
```