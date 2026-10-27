/**
 * @typedef {{ok:true,data:T}|{ok:false,errorCode:string,messageKey:string,params:Record<string,string|number>}} Result<T>
 * @template T
 */
/** @typedef {{id:string,kind:'hq'|'building'|'research'|'unit',parentIds:string[],producerId:string|null,unlocksUnitId:string|null,labelKey:string,descriptionKey:string,assetId:string,roleTags:string[],startsUnlocked:boolean,minWave:number,revealParentIds:string[]}} TechNode */
/** @typedef {{row:number,col:number}} Cell */
/** @typedef {{instanceId:string,unitId:string,cell:Cell,paidCost:number}} Placement */
/** @typedef {{id:string,kind:'building'|'research'|'upgrade',nodeId:string,profileId:string|null,level:number,paidCost:number}} Investment */
/** @typedef {{mode:'preview'|'campaign',phase:'preparation'|'combat'|'victory'|'defeat'|'clear',campaignId:string,wave:number,seed:number,rngState:number,supplies:number|null,formationStage:string,buildingIds:string[],researchIds:string[],upgradeLevels:Record<string,Record<string,number>>,investments:Investment[],placements:Placement[],commandIds:string[],revealedNodeIds:string[],acknowledgedNodeIds:string[],legacyFreeNodeIds:string[],tutorialStep:number,clearedWaveCount:number,resolutionIds:string[],hqHp:number,checkpoint:GameState|null}} GameState */
/** @typedef {{id:string,labelKey:string,costs:number[]|null,multipliers:number[]|null,effectKind?:'damage-multiplier'|'damage-divisor',nodeKinds?:('hq'|'building'|'research'|'unit')[]}} UpgradeProfile */
/** @typedef {{schemaVersion:number,configVersion:string,contentVersion:string,maxWave:number,combatSeconds:number,gridSize:number,hq:Cell,preview:{buildingIds:string[],researchIds:string[],formationStage:string},decisions:Record<string,string|null>}} Rules */
/** @typedef {{nodes:TechNode[],layouts:Record<string,Cell[]|null>,costs:Record<string,number|null>,upgrades:UpgradeProfile[],rules:Rules}} DomainConfig */
/** @typedef {{type:'research'|'build'|'upgrade'|'place'|'move'|'swap'|'cancel'|'acknowledge'|'refund',commandId:string,nodeId?:string,profileId?:string,instanceId?:string,otherId?:string,cell?:Cell,refundToken?:string}} PreparationCommand */
/** @typedef {{schemaVersion:number,configVersion:string,contentVersion:string,savedAt:string,state:GameState,checksum:string}} SaveEnvelope */
/** @typedef {{read:(backup?:boolean)=>Promise<string|null>,write:(raw:string,preserveOriginal:boolean)=>Promise<void>}} SaveAdapter */
/** @typedef {{locale:string,reducedMotion:boolean,bgmVolume:number,sfxVolume:number,speed:number}} Settings */
export {};
