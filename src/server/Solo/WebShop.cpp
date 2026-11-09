#include "stdafx.h"
#include "WebShop.h"
#include "SoloDataServer.h"
#include "ItemManager.h"
#include "Item.h"
#include "Log.h"
#include "Notice.h"
#include "Path.h"
#include "Util.h"
#include <fstream>
#include <sstream>

CWebShop gWebShop;

void CWebShop::Load()
{
	this->m_Entries.clear();
	this->m_Loaded = true;

	std::ifstream file(gPath.GetFullPath("WebShop.txt"));

	if (!file.is_open())
	{
		LogAdd(LOG_RED, "[WebShop] Could not open WebShop.txt");
		return;
	}

	std::string line;

	while (std::getline(file, line))
	{
		if (line.size() < 2 || line.compare(0, 2, "//") == 0)
		{
			continue;
		}

		std::istringstream ss(line);

		std::string first;

		ss >> first;

		if (first == "LevelCost")
		{
			for (int i = 0; i <= WEBSHOP_MAX_LEVEL; i++)
			{
				ss >> this->m_LevelCost[i];
			}

			continue;
		}

		if (first == "SkillCost") { ss >> this->m_SkillCost; continue; }
		if (first == "LuckCost") { ss >> this->m_LuckCost; continue; }
		if (first == "AddCost") { ss >> this->m_AddCost; continue; }
		if (first == "ExcCost") { ss >> this->m_ExcCost; continue; }

		WEBSHOP_ENTRY e;

		std::istringstream es(line);

		if (!(es >> e.Id >> e.Category >> e.Base >> e.Section >> e.Index >> e.MaxLevel >> e.MaxAdd >> e.Skill >> e.Luck >> e.ExcBits))
		{
			continue;
		}

		if (e.MaxLevel > WEBSHOP_MAX_LEVEL || e.ExcBits > 6 || e.MaxAdd > 7)
		{
			LogAdd(LOG_RED, "[WebShop] Skipping entry %d: option limits out of range", e.Id);
			continue;
		}

		ITEM_INFO info;

		if (gItemManager.GetInfo(SafeGetItem(GET_ITEM(e.Section, e.Index)), &info) == 0)
		{
			LogAdd(LOG_RED, "[WebShop] Skipping entry %d: unknown item %d,%d", e.Id, e.Section, e.Index);
			continue;
		}

		this->m_Entries.push_back(e);
	}

	LogAdd(LOG_BLUE, "[WebShop] Loaded %d entries", (int)this->m_Entries.size());
}

const WEBSHOP_ENTRY* CWebShop::Find(int id) const
{
	for (const WEBSHOP_ENTRY& e : this->m_Entries)
	{
		if (e.Id == id)
		{
			return &e;
		}
	}

	return nullptr;
}

void CWebShop::Grant(LPOBJ lpObj, DWORD amount)
{
	DWORD points = 0;
	DWORD total = 0;

	if (!SoloDataServer_GetShopPoints(lpObj->Name, &points, &total))
	{
		return;
	}

	points += amount;
	total += amount;

	if (SoloDataServer_SetShopPoints(lpObj->Name, points, total))
	{
		gNotice.GCNoticeSend(lpObj->Index, 1, "[Reset Shop] +%d RP (balance: %d RP)", (int)amount, (int)points);
	}
}

void CWebShop::OnReset(LPOBJ lpObj)
{
	DWORD amount = WEBSHOP_POINTS_PER_RESET;

	if (lpObj->Reset > 0 && (lpObj->Reset % WEBSHOP_MILESTONE_STEP) == 0)
	{
		amount += WEBSHOP_MILESTONE_BONUS;
	}

	this->Grant(lpObj, amount);
}

void CWebShop::OnGrandReset(LPOBJ lpObj)
{
	this->Grant(lpObj, WEBSHOP_POINTS_PER_GRAND_RESET);
}

static void JsonEscape(std::string& out, const char* s)
{
	for (; *s; ++s)
	{
		if (*s == '"' || *s == '\\')
		{
			out += '\\';
		}

		if ((unsigned char)*s >= 0x20)
		{
			out += *s;
		}
	}
}

std::string CWebShop::BuildStateJson(int aIndex)
{
	if (!this->m_Loaded)
	{
		this->Load();
	}

	LPOBJ lpObj = nullptr;

	DWORD points = 0;
	DWORD total = 0;

	if (OBJECT_USER_RANGE(aIndex) && gObjIsConnectedGP(aIndex) != 0 && gObj[aIndex].Type == OBJECT_USER)
	{
		lpObj = &gObj[aIndex];
		SoloDataServer_GetShopPoints(lpObj->Name, &points, &total);
	}

	std::string json = "{";

	json += "\"inGame\":" + std::string(lpObj ? "true" : "false");
	json += ",\"points\":" + std::to_string(points);
	json += ",\"total\":" + std::to_string(total);
	json += ",\"reset\":" + std::to_string(lpObj ? (int)lpObj->Reset : 0);
	json += ",\"grandReset\":" + std::to_string(lpObj ? (int)lpObj->GrandReset : 0);
	json += ",\"perReset\":" + std::to_string(WEBSHOP_POINTS_PER_RESET);
	json += ",\"milestoneStep\":" + std::to_string(WEBSHOP_MILESTONE_STEP);
	json += ",\"milestoneBonus\":" + std::to_string(WEBSHOP_MILESTONE_BONUS);
	json += ",\"perGrandReset\":" + std::to_string(WEBSHOP_POINTS_PER_GRAND_RESET);
	json += ",\"maxQty\":" + std::to_string(WEBSHOP_MAX_QTY);
	json += ",\"levelCost\":[";

	for (int i = 0; i <= WEBSHOP_MAX_LEVEL; i++)
	{
		json += (i ? "," : "") + std::to_string(this->m_LevelCost[i]);
	}

	json += "],\"skillCost\":" + std::to_string(this->m_SkillCost);
	json += ",\"luckCost\":" + std::to_string(this->m_LuckCost);
	json += ",\"addCost\":" + std::to_string(this->m_AddCost);
	json += ",\"excCost\":" + std::to_string(this->m_ExcCost);
	json += ",\"items\":[";

	bool first = true;

	for (const WEBSHOP_ENTRY& e : this->m_Entries)
	{
		ITEM_INFO info;

		if (gItemManager.GetInfo(SafeGetItem(GET_ITEM(e.Section, e.Index)), &info) == 0)
		{
			continue;
		}

		if (!first)
		{
			json += ",";
		}

		first = false;

		json += "{\"id\":" + std::to_string(e.Id);
		json += ",\"cat\":\"";
		JsonEscape(json, e.Category.c_str());
		json += "\",\"name\":\"";
		JsonEscape(json, info.Name);
		json += "\",\"sec\":" + std::to_string(e.Section);
		json += ",\"idx\":" + std::to_string(e.Index);
		json += ",\"base\":" + std::to_string(e.Base);
		json += ",\"maxLevel\":" + std::to_string(e.MaxLevel);
		json += ",\"maxAdd\":" + std::to_string(e.MaxAdd);
		json += ",\"skill\":" + std::to_string(e.Skill);
		json += ",\"luck\":" + std::to_string(e.Luck);
		json += ",\"excBits\":" + std::to_string(e.ExcBits) + "}";
	}

	json += "]}";

	return json;
}

bool CWebShop::Validate(const WEBSHOP_ENTRY* e, const WEBSHOP_OPTIONS& opt) const
{
	if (opt.Level < 0 || opt.Level > e->MaxLevel) return false;
	if (opt.Add < 0 || opt.Add > e->MaxAdd) return false;
	if (opt.Skill != 0 && (opt.Skill != 1 || e->Skill == 0)) return false;
	if (opt.Luck != 0 && (opt.Luck != 1 || e->Luck == 0)) return false;
	if (opt.Exc < 0 || opt.Exc >= (1 << e->ExcBits)) return false;
	return true;
}

long long CWebShop::Price(const WEBSHOP_ENTRY* e, const WEBSHOP_OPTIONS& opt) const
{
	long long price = e->Base + this->m_LevelCost[opt.Level];

	price += (long long)opt.Skill * this->m_SkillCost;
	price += (long long)opt.Luck * this->m_LuckCost;
	price += (long long)opt.Add * this->m_AddCost;

	for (int bit = 0; bit < 6; bit++)
	{
		if (opt.Exc & (1 << bit))
		{
			price += this->m_ExcCost;
		}
	}

	return price;
}

int CWebShop::Buy(int aIndex, int id, int qty, const WEBSHOP_OPTIONS& opt, int* delivered)
{
	*delivered = 0;

	if (!this->m_Loaded)
	{
		this->Load();
	}

	if (!OBJECT_USER_RANGE(aIndex) || gObjIsConnectedGP(aIndex) == 0 || gObj[aIndex].Type != OBJECT_USER)
	{
		return WEBSHOP_ERR_NOT_IN_GAME;
	}

	LPOBJ lpObj = &gObj[aIndex];

	const WEBSHOP_ENTRY* e = this->Find(id);

	if (e == nullptr)
	{
		return WEBSHOP_ERR_UNKNOWN_ITEM;
	}

	if (qty < 1 || qty > WEBSHOP_MAX_QTY)
	{
		return WEBSHOP_ERR_BAD_QTY;
	}

	if (!this->Validate(e, opt))
	{
		return WEBSHOP_ERR_BAD_OPTIONS;
	}

	long long unitPrice = this->Price(e, opt);

	DWORD points = 0;
	DWORD total = 0;

	if (!SoloDataServer_GetShopPoints(lpObj->Name, &points, &total))
	{
		return WEBSHOP_ERR_SAVE;
	}

	if ((long long)points < unitPrice * qty)
	{
		return WEBSHOP_ERR_NO_POINTS;
	}

	int itemIndex = SafeGetItem(GET_ITEM(e->Section, e->Index));

	CItem item;

	item.m_Level = opt.Level;

	item.m_Durability = (float)gItemManager.GetItemDurability(itemIndex, opt.Level, opt.Exc);

	item.Convert(itemIndex, opt.Skill, opt.Luck, opt.Add, opt.Exc);

	for (int i = 0; i < qty; i++)
	{
		if (gItemManager.CheckItemInventorySpace(lpObj, itemIndex) == 0)
		{
			break;
		}

		BYTE slot = gItemManager.InventoryInsertItem(lpObj->Index, item);

		if (slot == 0xFF)
		{
			break;
		}

		gItemManager.GCItemModifySend(lpObj->Index, slot);

		(*delivered)++;
	}

	if (*delivered == 0)
	{
		return WEBSHOP_ERR_NO_SPACE;
	}

	// Charge only for what was actually delivered
	int charge = (int)(unitPrice * (*delivered));

	points -= (DWORD)charge;

	if (!SoloDataServer_SetShopPoints(lpObj->Name, points, total))
	{
		return WEBSHOP_ERR_SAVE;
	}

	LogAdd(LOG_BLUE, "[WebShop] [%s] bought id=%d x%d (+%d skill%d luck%d add%d exc%d) for %d RP (balance %d)", lpObj->Name, e->Id, *delivered, opt.Level, opt.Skill, opt.Luck, opt.Add, opt.Exc, charge, (int)points);

	return (*delivered < qty) ? WEBSHOP_ERR_NO_SPACE : WEBSHOP_OK;
}
