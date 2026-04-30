import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as jalaali from 'jalaali-js';

const Tab = createMaterialTopTabNavigator();

// تبدیل تاریخ میلادی به شمسی
const toJalaali = (date) => {
  const jd = jalaali.toJalaali(date);
  return `${jd.jy}/${String(jd.jm).padStart(2, '0')}/${String(jd.jd).padStart(2, '0')}`;
};

// ذخیره و بارگذاری
const saveToStorage = async (key, data) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

const loadFromStorage = async (key) => {
  const json = await AsyncStorage.getItem(key);
  return json ? JSON.parse(json) : [];
};

// محاسبه وضعیت و رنگ
const calculateStatus = (lastKm, nextKm, currentKm, nextDate) => {
  const today = new Date();
  const next = new Date(nextDate);
  const daysLeft = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  const kmLeft = nextKm - currentKm;
  const percentKm = ((nextKm - lastKm) - kmLeft) / (nextKm - lastKm) * 100;

  if (kmLeft <= 0 || daysLeft <= 0) return { color: '#FFCDD2', text: '🔥 منقضی شده' };
  if (daysLeft <= 15 || percentKm >= 85) return { color: '#FFCDD2', text: '🔴 فوری' };
  if (daysLeft <= 45 || percentKm >= 60) return { color: '#FFE0B2', text: '🟠 نزدیک است' };
  return { color: '#C8E6C9', text: '✅ عادی' };
};

// صفحه سرویس‌های هر خودرو
const CarServicesScreen = ({ car, onCarDelete, onCarUpdate }) => {
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formLastKm, setFormLastKm] = useState('');
  const [formNextKm, setFormNextKm] = useState('');
  const [formLastDate, setFormLastDate] = useState(new Date());
  const [formNextDate, setFormNextDate] = useState(new Date());
  const [formNote, setFormNote] = useState('');
  const [showLastPicker, setShowLastPicker] = useState(false);
  const [showNextPicker, setShowNextPicker] = useState(false);
  const [currentKm, setCurrentKm] = useState(car.currentKm);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const data = await loadFromStorage(`services_${car.id}`);
    setServices(data);
  };

  const saveServices = async (newData) => {
    await saveToStorage(`services_${car.id}`, newData);
    setServices(newData);
  };

  const openAddModal = () => {
    setEditId(null);
    setFormTitle('');
    setFormLastKm('');
    setFormNextKm('');
    setFormLastDate(new Date());
    setFormNextDate(new Date());
    setFormNote('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setFormTitle(item.title);
    setFormLastKm(item.lastKm.toString());
    setFormNextKm(item.nextKm.toString());
    setFormLastDate(new Date(item.lastDate));
    setFormNextDate(new Date(item.nextDate));
    setFormNote(item.note);
    setShowModal(true);
  };

  const saveService = () => {
    if (!formTitle || !formLastKm || !formNextKm) {
      Alert.alert('خطا', 'لطفاً عنوان و کیلومتر را وارد کنید');
      return;
    }

    const newService = {
      id: editId || Date.now().toString(),
      title: formTitle,
      lastKm: parseInt(formLastKm),
      nextKm: parseInt(formNextKm),
      lastDate: formLastDate.toISOString(),
      nextDate: formNextDate.toISOString(),
      note: formNote,
    };

    let newServices;
    if (editId) {
      newServices = services.map(s => s.id === editId ? newService : s);
    } else {
      newServices = [...services, newService];
    }
    saveServices(newServices);
    setShowModal(false);
  };

  const deleteService = (id) => {
    Alert.alert('حذف', 'آیا این سرویس حذف شود؟', [
      { text: 'انصراف' },
      { text: 'حذف', onPress: () => saveServices(services.filter(s => s.id !== id)) },
    ]);
  };

  const updateCurrentKm = () => {
    Alert.prompt('ویرایش کیلومتر', 'کیلومتر فعلی خودرو را وارد کنید', [
      { text: 'انصراف' },
      {
        text: 'ذخیره',
        onPress: (value) => {
          const km = parseInt(value);
          if (!isNaN(km)) {
            setCurrentKm(km);
            onCarUpdate(car.id, km);
          }
        },
      },
    ]);
  };

  const renderServiceItem = ({ item }) => {
    const status = calculateStatus(item.lastKm, item.nextKm, currentKm, item.nextDate);
    return (
      <View style={{ marginBottom: 12, backgroundColor: status.color, borderRadius: 16, padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteService(item.id)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text>📅 آخرین: {toJalaali(new Date(item.lastDate))} - {item.lastKm.toLocaleString()} کیلومتر</Text>
        <Text>⏳ موعد بعدی: {toJalaali(new Date(item.nextDate))} یا {item.nextKm.toLocaleString()} کیلومتر</Text>
        <Text style={{ fontWeight: 'bold', marginTop: 4 }}>{status.text}</Text>
        {item.note ? <Text>📝 {item.note}</Text> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <FlatList
        data={services}
        keyExtractor={item => item.id}
        renderItem={renderServiceItem}
        ListHeaderComponent={
          <View style={{ margin: 12, padding: 16, backgroundColor: 'white', borderRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold' }}>🚗 {car.name}</Text>
              <TouchableOpacity onPress={() => onCarDelete(car.id)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: 'red' }}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontSize: 16 }}>📅 کیلومتر فعلی: {currentKm.toLocaleString()} کیلومتر</Text>
              <TouchableOpacity onPress={updateCurrentKm} style={{ padding: 8 }}>
                <Text style={{ fontSize: 18 }}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            onPress={openAddModal}
            style={{ backgroundColor: '#1E4D6F', margin: 12, padding: 14, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>➕ افزودن سرویس جدید</Text>
          </TouchableOpacity>
        }
      />

      {/* مودال فرم سرویس */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <ScrollView style={{ backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
              {editId ? 'ویرایش سرویس' : 'سرویس جدید'}
            </Text>

            <TextInput
              placeholder="عنوان سرویس"
              placeholderTextColor="#999"
              value={formTitle}
              onChangeText={setFormTitle}
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}
            />

            <TextInput
              placeholder="کیلومتر آخرین بار"
              placeholderTextColor="#999"
              value={formLastKm}
              onChangeText={setFormLastKm}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}
            />

            <TextInput
              placeholder="کیلومتر بعدی"
              placeholderTextColor="#999"
              value={formNextKm}
              onChangeText={setFormNextKm}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}
            />

            <TouchableOpacity onPress={() => setShowLastPicker(true)} style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text>📅 تاریخ آخرین: {toJalaali(formLastDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowNextPicker(true)} style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text>📅 تاریخ بعدی: {toJalaali(formNextDate)}</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="یادداشت (اختیاری)"
              placeholderTextColor="#999"
              value={formNote}
              onChangeText={setFormNote}
              multiline
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12, minHeight: 60 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 12, backgroundColor: '#CCC', borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' }}>
                <Text>انصراف</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveService} style={{ padding: 12, backgroundColor: '#1E4D6F', borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' }}>
                <Text style={{ color: 'white' }}>ذخیره</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {showLastPicker && (
        <DateTimePicker
          value={formLastDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowLastPicker(false);
            if (date) setFormLastDate(date);
          }}
        />
      )}

      {showNextPicker && (
        <DateTimePicker
          value={formNextDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowNextPicker(false);
            if (date) setFormNextDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
};

// اپلیکیشن اصلی
export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    let saved = await loadFromStorage('cars');
    if (saved.length === 0) {
      saved = [
        { id: '1', name: 'Nissan Juke', currentKm: 25000 },
        { id: '2', name: 'BMW X3', currentKm: 18000 },
      ];
      await saveToStorage('cars', saved);
    }
    setCars(saved);
    setLoading(false);
  };

  const addCar = () => {
    Alert.prompt('خودرو جدید', 'نام خودرو را وارد کنید', [
      { text: 'انصراف' },
      {
        text: 'افزودن',
        onPress: (name) => {
          if (name && name.trim()) {
            const newCar = {
              id: Date.now().toString(),
              name: name.trim(),
              currentKm: 0,
            };
            const newCars = [...cars, newCar];
            saveToStorage('cars', newCars);
            setCars(newCars);
            Alert.alert('موفق', 'خودرو اضافه شد');
          } else {
            Alert.alert('خطا', 'نام خودرو را وارد کنید');
          }
        },
      },
    ]);
  };

  const deleteCar = (id) => {
    Alert.alert('حذف خودرو', 'آیا از حذف این خودرو اطمینان دارید؟', [
      { text: 'انصراف' },
      {
        text: 'حذف',
        onPress: async () => {
          const newCars = cars.filter(car => car.id !== id);
          await saveToStorage('cars', newCars);
          setCars(newCars);
          Alert.alert('موفق', 'خودرو حذف شد');
        },
      },
    ]);
  };

  const updateCarKm = (id, newKm) => {
    const newCars = cars.map(car => car.id === id ? { ...car, currentKm: newKm } : car);
    saveToStorage('cars', newCars);
    setCars(newCars);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <Text>در حال بارگذاری...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: '#1E4D6F' },
          tabBarIndicatorStyle: { backgroundColor: '#FF9800' },
          tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', color: 'white' },
        }}
      >
        {cars.map(car => (
          <Tab.Screen key={car.id} name={car.name}>
            {() => <CarServicesScreen car={car} onCarDelete={deleteCar} onCarUpdate={updateCarKm} />}
          </Tab.Screen>
        ))}
      </Tab.Navigator>

      {/* دکمه افزودن خودرو جدید */}
      <TouchableOpacity
        onPress={addCar}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          backgroundColor: '#1E4D6F',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>+</Text>
      </TouchableOpacity>
    </NavigationContainer>
  );
}