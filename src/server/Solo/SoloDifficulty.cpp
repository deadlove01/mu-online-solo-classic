#include "stdafx.h"
#include "SoloDifficulty.h"
#include "ServerInfo.h"
#include "ServerDisplayer.h"
#include "ShopManager.h"
#include "Util.h"
#include "Log.h"

static SOLO_DIFFICULTY_MODE g_CurrentMode = SOLO_DIFFICULTY_EASY;

SOLO_DIFFICULTY_CONFIG g_SoloDifficulty = {
	300,   // expRate (300x)
	300,   // eventExpRate (300x)
	150,   // itemDropRate (150%)
	100,   // zenDropRate (100%)
	300,   // resetLevel (Level 300)
	50,    // grandResetResets (50)
	0.7f,  // monsterHpRate (0.7x)
	0.7f,  // monsterDmgRate (0.7x)
	0.0f,  // deathExpPenalty (None)
	10.0f  // excDropRate (10x)
};

static const SOLO_DIFFICULTY_CONFIG kDifficultyPresets[6] = {
	// 0: 🟢 Easy (Arcadia)
	{
		300,   // expRate
		300,   // eventExpRate
		150,   // itemDropRate
		100,   // zenDropRate
		300,   // resetLevel
		50,    // grandResetResets
		0.7f,  // monsterHpRate
		0.7f,  // monsterDmgRate
		0.0f,  // deathExpPenalty (None)
		10.0f  // excDropRate
	},
	// 1: 🟡 Medium (Valhalla)
	{
		100,   // expRate
		100,   // eventExpRate
		100,   // itemDropRate
		50,    // zenDropRate
		400,   // resetLevel
		100,   // grandResetResets
		1.0f,  // monsterHpRate
		1.0f,  // monsterDmgRate
		0.03f, // deathExpPenalty (Normal 3%)
		5.0f   // excDropRate
	},
	// 2: 🔴 Hard (Asgard)
	{
		30,    // expRate
		30,    // eventExpRate
		50,    // itemDropRate
		25,    // zenDropRate
		400,   // resetLevel
		150,   // grandResetResets
		1.5f,  // monsterHpRate
		1.5f,  // monsterDmgRate
		0.06f, // deathExpPenalty (Double 6%)
		2.0f   // excDropRate
	},
	// 3: 🟣 Easy FUN (Elysium) - same stats as Easy, with FUN shops
	{
		9999,   // expRate
		9999,   // eventExpRate
		1500,   // itemDropRate
		5000,   // zenDropRate
		300,   // resetLevel
		50,    // grandResetResets
		0.7f,  // monsterHpRate
		0.7f,  // monsterDmgRate
		0.0f,  // deathExpPenalty (None)
		10.0f  // excDropRate
	},
	// 4: 🟣 Medium FUN (Olympus) - same stats as Medium, with FUN shops
	{
		100,   // expRate
		100,   // eventExpRate
		100,   // itemDropRate
		50,    // zenDropRate
		400,   // resetLevel
		100,   // grandResetResets
		1.0f,  // monsterHpRate
		1.0f,  // monsterDmgRate
		0.03f, // deathExpPenalty (Normal 3%)
		5.0f   // excDropRate
	},
	// 5: 🟣 Hard FUN (Atlantis) - same stats as Hard, with FUN shops
	{
		30,    // expRate
		30,    // eventExpRate
		50,    // itemDropRate
		25,    // zenDropRate
		400,   // resetLevel
		150,   // grandResetResets
		1.5f,  // monsterHpRate
		1.5f,  // monsterDmgRate
		0.06f, // deathExpPenalty (Double 6%)
		2.0f   // excDropRate
	}
};

void SoloDifficulty_Apply(SOLO_DIFFICULTY_MODE mode)
{
	if (mode < SOLO_DIFFICULTY_EASY || mode > SOLO_DIFFICULTY_HARD_FUN)
	{
		mode = SOLO_DIFFICULTY_EASY;
	}

	g_CurrentMode = mode;
	g_SoloDifficulty = kDifficultyPresets[mode];

	// Apply to ServerInfo rates
	for (int i = 0; i < MAX_ACCOUNT_LEVEL; ++i)
	{
		gServerInfo.m_AddExperienceRate[i] = g_SoloDifficulty.expRate;
		gServerInfo.m_AddEventExperienceRate[i] = g_SoloDifficulty.eventExpRate;
		gServerInfo.m_ItemDropRate[i] = g_SoloDifficulty.itemDropRate;
		gServerInfo.m_MoneyAmountDropRate[i] = g_SoloDifficulty.zenDropRate;
		gServerInfo.m_CommandResetLevel[i] = g_SoloDifficulty.resetLevel;
		gServerInfo.m_CommandGrandResetReset[i] = g_SoloDifficulty.grandResetResets;
	}

	// Strictly disable player-to-player trade
	gServerInfo.m_TradeSwitch = 0;

	// Load appropriate shop item catalog (Classic vs FUN with top items/wings/kundun boxes)
	bool isFun = (mode >= SOLO_DIFFICULTY_EASY_FUN && mode <= SOLO_DIFFICULTY_HARD_FUN);
	gShopManager.LoadShop(isFun ? "ShopFun\\" : "Shop\\");
	gShopManager.ReloadShopInterface();

	LogAdd(LOG_BLUE, "[SoloDifficulty] Applied Mode: %s (EXP: %dx, ItemDrop: %d%%, Zen: %d%%, Monster: %.1fx, Shops: %s)",
		SoloDifficulty_GetName(mode),
		g_SoloDifficulty.expRate,
		g_SoloDifficulty.itemDropRate,
		g_SoloDifficulty.zenDropRate,
		g_SoloDifficulty.monsterHpRate,
		isFun ? "FUN (Top Gear/Wings/Boxes)" : "Classic");
}

SOLO_DIFFICULTY_CONFIG SoloDifficulty_Get()
{
	return g_SoloDifficulty;
}

SOLO_DIFFICULTY_MODE SoloDifficulty_GetMode()
{
	return g_CurrentMode;
}

const char* SoloDifficulty_GetName(SOLO_DIFFICULTY_MODE mode)
{
	switch (mode)
	{
		case SOLO_DIFFICULTY_EASY:       return "Easy (Arcadia)";
		case SOLO_DIFFICULTY_MEDIUM:     return "Medium (Valhalla)";
		case SOLO_DIFFICULTY_HARD:       return "Hard (Asgard)";
		case SOLO_DIFFICULTY_EASY_FUN:   return "Easy FUN (Elysium)";
		case SOLO_DIFFICULTY_MEDIUM_FUN: return "Medium FUN (Olympus)";
		case SOLO_DIFFICULTY_HARD_FUN:   return "Hard FUN (Atlantis)";
		default:                         return "Unknown";
	}
}
