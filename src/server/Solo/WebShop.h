#pragma once

#include "stdafx.h"
#include "User.h"
#include <string>
#include <vector>

#define WEBSHOP_POINTS_PER_RESET 100
#define WEBSHOP_MILESTONE_STEP 10
#define WEBSHOP_MILESTONE_BONUS 60
#define WEBSHOP_POINTS_PER_GRAND_RESET 1500
#define WEBSHOP_MAX_QTY 10
#define WEBSHOP_MAX_LEVEL 15

enum WEBSHOP_RESULT
{
	WEBSHOP_OK = 0,
	WEBSHOP_ERR_NOT_IN_GAME = 1,
	WEBSHOP_ERR_UNKNOWN_ITEM = 2,
	WEBSHOP_ERR_BAD_QTY = 3,
	WEBSHOP_ERR_BAD_OPTIONS = 4,
	WEBSHOP_ERR_NO_POINTS = 5,
	WEBSHOP_ERR_NO_SPACE = 6,
	WEBSHOP_ERR_SAVE = 7,
};

struct WEBSHOP_ENTRY
{
	int Id;
	std::string Category;
	int Base;
	int Section;
	int Index;
	int MaxLevel;
	int MaxAdd;
	int Skill;
	int Luck;
	int ExcBits;
};

struct WEBSHOP_OPTIONS
{
	int Level;
	int Skill;
	int Luck;
	int Add;
	int Exc;
};

class CWebShop
{
public:
	void Load();
	void OnReset(LPOBJ lpObj);
	void OnGrandReset(LPOBJ lpObj);
	std::string BuildStateJson(int aIndex);
	int Buy(int aIndex, int id, int qty, const WEBSHOP_OPTIONS& opt, int* delivered);

private:
	const WEBSHOP_ENTRY* Find(int id) const;
	bool Validate(const WEBSHOP_ENTRY* e, const WEBSHOP_OPTIONS& opt) const;
	long long Price(const WEBSHOP_ENTRY* e, const WEBSHOP_OPTIONS& opt) const;
	void Grant(LPOBJ lpObj, DWORD amount);

	std::vector<WEBSHOP_ENTRY> m_Entries;
	int m_LevelCost[WEBSHOP_MAX_LEVEL + 1] = {};
	int m_SkillCost = 0;
	int m_LuckCost = 0;
	int m_AddCost = 0;
	int m_ExcCost = 0;
	bool m_Loaded = false;
};

extern CWebShop gWebShop;
