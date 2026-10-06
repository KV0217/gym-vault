import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Droplets, Apple, Trash2, Search } from 'lucide-react';
import { format, addDays } from 'date-fns';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Nutrition() {
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState('breakfast');
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantityG, setQuantityG] = useState(100);

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  const loadNutritionData = async () => {
    try {
      const [pRes, sRes, mRes, wRes, fRes] = await Promise.all([
        api('/profile'),
        api(`/nutrition/daily-summary/${dateStr}`),
        api(`/nutrition/meals?date=${dateStr}`),
        api(`/nutrition/water?date=${dateStr}`),
        api('/nutrition/foods'),
      ]);

      setProfile(pRes);
      setSummary(sRes || { calories: 0, protein: 0, carbs: 0, fat: 0 });
      setMeals(mRes || []);
      setWaterTotal(wRes?.total_ml || 0);
      setFoods(fRes || []);
    } catch (err) {
      console.error('Failed to load nutrition data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNutritionData();
  }, [dateStr]);

  const changeDate = (days) => {
    triggerHaptic(HapticType.LIGHT);
    setCurrentDate(prev => addDays(prev, days));
  };

  const handleOpenAddFood = (mealType) => {
    triggerHaptic(HapticType.LIGHT);
    setActiveMealType(mealType);
    setSelectedFood(null);
    setQuantityG(100);
    setIsFoodModalOpen(true);
  };

  const handleAddFoodSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFood) {
      showToast('Please select a food item', 'error');
      return;
    }

    try {
      await api('/nutrition/meals', {
        method: 'POST',
        body: {
          date: dateStr,
          meal_type: activeMealType,
          entries: [
            {
              food_item_id: selectedFood.id,
              quantity_g: parseFloat(quantityG) || 100,
            },
          ],
        },
      });

      triggerHaptic(HapticType.SUCCESS);
      showToast(`Added ${selectedFood.name} to ${activeMealType}!`, 'success');
      setIsFoodModalOpen(false);
      loadNutritionData();
    } catch (err) {
      showToast('Error adding food: ' + err.message, 'error');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    triggerHaptic(HapticType.HEAVY);
    try {
      await api(`/nutrition/meals/${mealId}`, { method: 'DELETE' });
      showToast('Meal entry removed', 'info');
      loadNutritionData();
    } catch (err) {
      showToast('Error removing entry: ' + err.message, 'error');
    }
  };

  const handleLogWater = async (amountMl) => {
    triggerHaptic(HapticType.LIGHT);
    try {
      await api('/nutrition/water', {
        method: 'POST',
        body: {
          date: dateStr,
          amount_ml: amountMl,
        },
      });
      setWaterTotal(prev => prev + amountMl);
      showToast(`Logged ${amountMl}ml water! 💧`, 'success');
    } catch (err) {
      showToast('Error logging water: ' + err.message, 'error');
    }
  };

  const targetCalories = profile?.daily_calorie_target || profile?.tdee || 2500;
  const targetProtein = profile?.daily_protein_target || Math.round((profile?.weight_kg || 75) * 2);
  const targetCarbs = profile?.daily_carbs_target || Math.round((profile?.weight_kg || 75) * 3.5);
  const targetFat = profile?.daily_fat_target || Math.round((profile?.weight_kg || 75) * 1.0);
  const targetWater = (profile?.water_target_ml || 3000) / 1000;

  const filteredFoods = foods.filter(f =>
    f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
    (f.category && f.category.toLowerCase().includes(foodSearch.toLowerCase()))
  );

  const mealTypes = [
    { id: 'breakfast', title: 'Breakfast' },
    { id: 'lunch', title: 'Lunch' },
    { id: 'dinner', title: 'Dinner' },
    { id: 'snack', title: 'Snacks' },
  ];

  const ProgressBar = ({ label, value, target, colorClass, unit = 'g' }) => {
    const pct = Math.min(100, Math.round((value / (target || 1)) * 100));
    return (
      <div>
        <div className="flex justify-between text-xs mb-2 font-bold">
          <span className="text-[#A3A3A3] uppercase text-[11px]">{label}</span>
          <span className="text-white">
            {Math.round(value)}{unit} <span className="text-[#737373]">/ {target}{unit}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-[#262626]">
          <div
            className={`h-full ${colorClass} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      {/* Header with Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <Apple className="text-[#EF4444]" size={32} /> Nutrition Protocol
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Calorie balance, macro allocation, and daily hydration tracking.</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center bg-[#121212] border border-[#262626] rounded-2xl p-1.5 shadow-md self-start sm:self-auto">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-[#1A1A1A] text-[#A3A3A3] hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 font-black text-xs text-white uppercase whitespace-nowrap">
            {format(currentDate, 'EEE, MMM d, yyyy')}
          </span>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-[#1A1A1A] text-[#A3A3A3] hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Daily Macro Dashboard Card */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-4 border-b border-[#262626]">
          <div>
            <div className="text-xs text-[#A3A3A3] font-bold uppercase tracking-wider">TOTAL INTAKE</div>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1">
              {Math.round(summary.calories)}{' '}
              <span className="text-sm font-bold text-[#A3A3A3]">/ {targetCalories} kcal</span>
            </div>
          </div>
          <div className="text-xs text-[#EF4444] font-black px-4 py-1.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 self-start md:self-auto uppercase">
            {targetCalories - summary.calories > 0
              ? `${Math.round(targetCalories - summary.calories)} kcal remaining`
              : `${Math.round(summary.calories - targetCalories)} kcal over target`}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ProgressBar
            label="PROTEIN"
            value={summary.protein}
            target={targetProtein}
            colorClass="bg-[#EF4444]"
          />
          <ProgressBar
            label="CARBS"
            value={summary.carbs}
            target={targetCarbs}
            colorClass="bg-white"
          />
          <ProgressBar
            label="FAT"
            value={summary.fat}
            target={targetFat}
            colorClass="bg-[#A3A3A3]"
          />
        </div>
      </div>

      {/* Hydration Tracker Card */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black border border-[#262626] text-[#EF4444] flex items-center justify-center shrink-0">
            <Droplets size={24} className="text-[#EF4444]" />
          </div>
          <div>
            <h3 className="font-black text-base text-white uppercase">Hydration</h3>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              {(waterTotal / 1000).toFixed(1)}L logged / {targetWater.toFixed(1)}L daily goal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleLogWater(250)}
            className="bg-[#171717] hover:bg-[#222222] border border-[#262626] hover:border-[#EF4444] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            + 250 ml (Glass)
          </button>
          <button
            onClick={() => handleLogWater(500)}
            className="bg-[#171717] hover:bg-[#222222] border border-[#262626] hover:border-[#EF4444] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            + 500 ml (Bottle)
          </button>
        </div>
      </div>

      {/* Meal Sections */}
      <div className="space-y-4">
        {mealTypes.map(mType => {
          const typeMeals = meals.filter(m => m.meal_type.toLowerCase() === mType.id);
          const mealCalories = typeMeals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
          const mealProtein = typeMeals.reduce((sum, m) => sum + (m.total_protein || 0), 0);

          return (
            <div
              key={mType.id}
              className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-md"
            >
              <div className="p-4 sm:p-5 bg-[#0D0D0D] border-b border-[#262626] flex justify-between items-center">
                <div>
                  <h3 className="font-black text-base text-white uppercase">{mType.title}</h3>
                  <div className="text-[11px] text-[#A3A3A3] font-bold mt-0.5">
                    {Math.round(mealCalories)} kcal • {Math.round(mealProtein)}g protein
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddFood(mType.id)}
                  className="bg-[#171717] hover:bg-[#222222] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-[#262626] hover:border-[#EF4444] cursor-pointer"
                >
                  <Plus size={14} className="text-[#EF4444]" /> Add Food
                </button>
              </div>

              <div className="p-4 sm:p-5">
                {typeMeals.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#737373]">
                    No foods logged for {mType.title.toLowerCase()} yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {typeMeals.map(meal => (
                      <div
                        key={meal.id}
                        className="p-3.5 bg-[#0D0D0D] rounded-2xl border border-[#262626] flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{meal.food_name || 'Food item'}</div>
                          <div className="text-[10px] text-[#A3A3A3] mt-0.5">
                            {meal.quantity_g}g • {meal.calories} kcal • {meal.protein_g}g P • {meal.carbs_g}g C • {meal.fat_g}g F
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="text-[#737373] hover:text-[#EF4444] p-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Food Modal */}
      <Modal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        title={`Add to ${activeMealType.toUpperCase()}`}
      >
        <form onSubmit={handleAddFoodSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#EF4444]" size={16} />
            <input
              type="text"
              placeholder="Search foods (e.g. Chicken, Oats, Paneer, Rice)..."
              value={foodSearch}
              onChange={e => setFoodSearch(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl py-3 pl-10 pr-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {filteredFoods.map(food => {
              const isSelected = selectedFood?.id === food.id;
              return (
                <div
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center text-xs ${
                    isSelected
                      ? 'bg-[#171717] border-[#EF4444] text-white shadow-sm'
                      : 'bg-[#0D0D0D] border-[#262626] text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold">{food.name}</div>
                    <div className="text-[10px] text-[#737373]">
                      {food.calories_per_100g} kcal/100g • {food.protein_g}g P
                    </div>
                  </div>
                  {isSelected && <span className="text-[#EF4444] font-black text-xs">Selected</span>}
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Portion (grams)
            </label>
            <input
              type="number"
              step="5"
              min="10"
              value={quantityG}
              onChange={e => setQuantityG(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white font-bold focus:border-[#EF4444] outline-none"
            />
          </div>

          {selectedFood && (
            <div className="p-3.5 bg-[#0D0D0D] rounded-2xl border border-[#262626] text-xs">
              <div className="font-black text-white uppercase text-[11px] mb-2">Calculated Macros:</div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div>
                  <span className="text-[#737373]">Cals:</span>{' '}
                  <span className="font-bold text-white">
                    {Math.round(selectedFood.calories_per_100g * (quantityG / 100))}
                  </span>
                </div>
                <div>
                  <span className="text-[#737373]">Prot:</span>{' '}
                  <span className="font-bold text-[#EF4444]">
                    {Math.round(selectedFood.protein_g * (quantityG / 100) * 10) / 10}g
                  </span>
                </div>
                <div>
                  <span className="text-[#737373]">Carbs:</span>{' '}
                  <span className="font-bold text-white">
                    {Math.round(selectedFood.carbs_g * (quantityG / 100) * 10) / 10}g
                  </span>
                </div>
                <div>
                  <span className="text-[#737373]">Fat:</span>{' '}
                  <span className="font-bold text-[#A3A3A3]">
                    {Math.round(selectedFood.fat_g * (quantityG / 100) * 10) / 10}g
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFoodModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-[#A3A3A3] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
            >
              Add to Meal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
