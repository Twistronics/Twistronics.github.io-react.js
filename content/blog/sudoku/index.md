---
title: "使用C++解决数独问题"
date: "2013-10-07T13:15:30Z"
description: "使用C++解决数独问题"
tags: 
  - "C/C++"
  - "Algorithm"
---

`main.cpp`
```cpp
#include <iostream>
#include <fstream>
#include <stdlib.h>

using namespace std;


int sudoku_array[9][9];

bool isConformToRule()
{
	int num_vector = 0;

	for (int i = 0; i < 9; i++) {	// 判断每一横行是否符合规则
		num_vector = 0;
		for (int j = 0; j < 9; j++) {
			int now_number = sudoku_array[i][j];
			if (now_number != 0 && ((num_vector & (1 << now_number)) != 0))	// 存在重复数字时返回false
				return false;
			num_vector |= (1 << now_number);
		}
	}

	for (int j = 0; j < 9; j++) {	// 判断每一竖行是否符合规则
		num_vector = 0;
		for (int i = 0; i < 9; i++) {
			int now_number = sudoku_array[i][j];
			if (now_number != 0 && ((num_vector & (1 << now_number)) != 0))
				return false;
			num_vector |= (1 << now_number);
		}
	}

	for (int x = 0; x < 7; x += 3)	// 判断每一九宫格是否符合规则
		for (int y = 0; y < 7; y += 3) {
			num_vector = 0;
			for (int i = 0; i < 3; i++)
				for (int j = 0; j < 3; j++) {
					int now_number = sudoku_array[x + i][y + j];
					if (now_number != 0 && ((num_vector & (1 << now_number)) != 0))
						return false;
					num_vector |= (1 << now_number);
				}
		}

	return true;
}

bool backtrack(int pos_num)		// 暴力回溯
{
	int x = pos_num / 9;
	int y = pos_num % 9;

	while (sudoku_array[x][y] != 0 && pos_num < 9 * 9) {
		pos_num++;
		x = pos_num / 9;
		y = pos_num % 9;
	}

	if (!isConformToRule())
		return false;

	if (pos_num == 9 * 9)
		return true;

	for (int i = 1; i < 10; i++) {
		sudoku_array[x][y] = i;
		if (backtrack(pos_num + 1))
			return true;
	}

	sudoku_array[x][y] = 0;
	return false;
}

void initSudoku(char file_name[])
{
	ifstream input_file(file_name);
	char line[10];

	cout << "input : " << endl;

	for (int i = 0; i < 9; i++)		{
		input_file.getline(line, 10);
		cout << "    " << line << endl;
		for (int j = 0; j < 9; j++)
			sudoku_array[i][j] = (int)line[j] - (int) '0';
	}

	cout << endl;
	input_file.close();
}


void outputSudoku(char file_name[])
{
	ofstream output_file(file_name);

	cout << "result :" << endl;
	for (int i = 0; i < 9; i++) {
		cout << "  ";
		for (int j = 0; j < 9; j++) {
			cout << sudoku_array[i][j];
			output_file << sudoku_array[i][j];
		}
		cout << endl;
		output_file << endl;
	}
}

int main(int argc, char *argv[])
{
	if (argc != 3) {
		cout << "not enough arguments" << endl;
		return 0;
	}

	initSudoku(argv[1]);
	backtrack(0);
	outputSudoku(argv[2]);

	return 0;
}
```