---
title: "使用C++实现A*寻路算法"
date: "2013-10-08T13:15:30Z"
description: "使用C++实现A*寻路算法"
tags: 
  - "C/C++"
  - "Algorithm"
---

`main.cpp`
```cpp
#include <iostream>
#include <stdlib.h>
#include <assert.h>
#include <fstream> 
#include <list>
using namespace std;

const int x_pos[9] = { 1, 0, 0, 0, 1, 2, 2, 2, 1 };
const int y_pos[9] = { 1, 0, 1, 2, 2, 2, 1, 0, 0 };

class Status {
public:
	int state[3][3];
	int step;
	int zero_x;
	int zero_y;
	Status* pre;

	Status(int s[][3]) {
		for (int i = 0; i < 3; i++)
			for (int j = 0; j < 3; j++) {
				state[i][j] = s[i][j];
				if (s[i][j] == 0) {
					zero_x = i;
					zero_y = j;
				}
			}
		step = 0;
		pre = NULL;
	}

	Status() {
		for (int i = 0; i < 3; i++)
			for (int j = 0; j < 3; j++)
				state[i][j] = 0;

		step = 0;
		zero_x = 0;
		zero_y = 0;
		pre = NULL;
	}

	Status(const Status& s) {
		for (int i = 0; i < 3; i++)
			for (int j = 0; j < 3; j++)
				state[i][j] = s.state[i][j];

		step = s.step;
		zero_x = s.zero_x;
		zero_y = s.zero_y;
		pre = s.pre;

		assert(state[zero_x][zero_y] == 0);
	}

	bool equal(Status& s) {
		for (int i = 0; i < 3; i++)
			for (int j = 0; j < 3; j++)
				if (state[i][j] != s.state[i][j])
					return false;

		return true;
	}

	int f() {
		return g() + h();
	}
	int g() {
		return step;
	}
	int h() {
		int sum = 0;
		for (int i = 0; i < 3; i++)
			for (int j = 0; j < 3; j++) {
				int num = state[i][j];
				sum += abs(i - x_pos[num]) + abs(j - y_pos[num]);
			}
		return sum;
	}

	bool move(int cond, Status* p) {
		assert(state[zero_x][zero_y] == 0);
		switch (cond) {
		case 0:
			return upMove(p);
		case 1:
			return downMove(p);
		case 2:
			return leftMove(p);
		case 3:
			return rightMove(p);
		}
		return false;
	}

	bool upMove(Status* p) {
		if (zero_x <= 0)
			return false;

		int new_zero_x = zero_x - 1;
		int new_zero_y = zero_y;
		state[zero_x][zero_y] = state[new_zero_x][new_zero_y];
		state[new_zero_x][new_zero_y] = 0;
		zero_x = new_zero_x;
		zero_y = new_zero_y;

		step++;
		pre = p;
		return true;
	}

	bool downMove(Status* p) {
		if (zero_x >= 2)
			return false;

		int new_zero_x = zero_x + 1;
		int new_zero_y = zero_y;
		state[zero_x][zero_y] = state[new_zero_x][new_zero_y];
		state[new_zero_x][new_zero_y] = 0;
		zero_x = new_zero_x;
		zero_y = new_zero_y;

		step++;
		pre = p;
		return true;
	}

	bool leftMove(Status* p) {
		if (zero_y <= 0)
			return false;

		int new_zero_x = zero_x;
		int new_zero_y = zero_y - 1;
		state[zero_x][zero_y] = state[new_zero_x][new_zero_y];
		state[new_zero_x][new_zero_y] = 0;
		zero_x = new_zero_x;
		zero_y = new_zero_y;

		step++;
		pre = p;
		return true;
	}

	bool rightMove(Status* p) {
		if (zero_y >= 2)
			return false;

		int new_zero_x = zero_x;
		int new_zero_y = zero_y + 1;
		state[zero_x][zero_y] = state[new_zero_x][new_zero_y];
		state[new_zero_x][new_zero_y] = 0;
		zero_x = new_zero_x;
		zero_y = new_zero_y;

		step++;
		pre = p;
		return true;
	}
};

int main(int argc, char** argv)
{
	if (argc != 3)
		return 0;

	list<Status> OPEN;
	list<Status> CLOSED;
	ifstream input(argv[1]);

	int init_state[3][3];
	for (int i = 0; i < 3; i++)
		for (int j = 0; j < 3; j++)
			input >> init_state[i][j];

	input.close();

	Status init_status(init_state);
	OPEN.push_front(init_state);


	int end_state[3][3] = { { 1, 2, 3 },{ 8, 0, 4 },{ 7, 6, 5 } };
	Status end_status(end_state);

	list<Status>::iterator min_status = OPEN.begin();


	while (!OPEN.empty()) {
		min_status = OPEN.begin();
		for (list<Status>::iterator it = OPEN.begin(); it != OPEN.end(); it++)
			if (it->f() < min_status->f())
				min_status = it;

		if (min_status->equal(end_status))
			break;

		CLOSED.push_front(*min_status);
		Status* min_status_closed = &CLOSED.front();

		for (int i = 0; i < 4; i++) {
			Status next(*min_status);
			if (!next.move(i, min_status_closed))
				continue;

			bool is_next_in_OPEN = false;
			for (list<Status>::iterator it = OPEN.begin(); it != OPEN.end(); it++)
				if (it->equal(next)) {
					if (next.f() < min_status->f())
						OPEN.push_front(next);
					is_next_in_OPEN = true;
					break;
				}
			if (is_next_in_OPEN)
				continue;

			bool is_next_in_CLOSED = false;
			for (list<Status>::iterator it = CLOSED.begin(); it != CLOSED.end(); it++)
				if (it->equal(next)) {
					is_next_in_CLOSED = true;
					break;
				}
			if (is_next_in_CLOSED)
				continue;

			OPEN.push_front(next);
		}

		OPEN.erase(min_status);
	}

	ofstream output(argv[2]);

	if (!min_status->equal(end_status)) {
		output << "no solution" << endl;
		return 0;
	}

	list<Status> result;
	for (Status* p = &(*min_status); p != NULL && p->pre != NULL; p = p->pre)
		result.push_front(*p);

	output << min_status->step << endl;
	output << endl;

	for (list<Status>::iterator it = result.begin(); it != result.end(); it++) {
		for (int i = 0; i < 3; i++) {
			for (int j = 0; j < 3; j++)
				output << it->state[i][j] << " ";
			output << endl;
		}
		output << endl;
	}

	output.close();

	return 0;
}
```