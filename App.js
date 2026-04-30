import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as jalaali from 'jalaali-js';

const Tab = createMaterialTopTabNavigator();

// تبدیل تاریخ به شمسی
const toJalaali = (date) => {
  const jd = jalaali.toJalaali(date);
  return `${jd.jy}/${String(jd.jm).padStart(2, '0')}/${String(jd.jd).padStart(2, '0')}`;
};

// ذخیره و بازیابی
const saveData = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const getData = async (key) => {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

// صفحه هر خودرو
const CarPage = ({ car, onDeleteCar, onUpdateCar }) => {
  const [services, setServices] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceLastKm, setServiceLastKm] = useState('');
  const [serviceNextKm, setServiceNextKm] = useState('');
  const [serviceLastDate, setServiceLastDate] = useState(new Date());
  const [serviceNextDate, setServiceNextDate] = useState(new Date());
  const [serviceNote, setServiceNote] = useState('');
  const [showLastPicker, setShowLastPicker] = useState(false);
  const [showNextPicker, setShowNextPicker] = useState(false);
  const [currentKm, setCurrentKm] = useState(car.currentKm);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const saved = await getData(`services_${car.id}`);
    if (saved) setServices(saved);
  };

  const saveServices = async (newServices) => {
    await saveData(`services_${car.id}`, newServices);
    setServices(newServices);
  };

  const getCardColor = (item) => {
    const today = new Date();
    const next = new Date(item.nextDate);
    const daysLeft = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    const kmLeft = item.nextKm - currentKm;
    if (kmLeft <= 0 || daysLeft <= 0) return '#FFCDD2';
    if (daysLeft <= 15 || kmLeft <= 500) return '#FFCDD2';
    if (daysLeft <= 45 || kmLeft <= 2000) return '#FFE0B2';
    return '#C8E6C9';
  };

  const getStatusText = (item) => {
    const today = new Date();
    const next = new Date(item.nextDate);
    const daysLeft = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    const kmLeft = item.nextKm - currentKm;
    if (kmLeft <= 0 || daysLeft <= 0) return '🔥 منقضی شده';
    if (daysLeft <= 15 || kmLeft <= 500) return '🔴 فوری';
    if (daysLeft <= 45 || kmLeft <= 2000) return '🟠 نزدیک است';
    return '✅ عادی';
  };

  const openAddService = () => {
    setEditingService(null);
    setServiceTitle('');
    setServiceLastKm('');
    setServiceNextKm('');
    setServiceLastDate(new Date());
    setServiceNextDate(new Date());
    setServiceNote('');
    setModalVisible(true);
  };

  const openEditService = (item) => {
    setEditingService(item);
    setServiceTitle(item.title);
    setServiceLastKm(String(item.lastKm));
    setServiceNextKm(String(item.nextKm));
    setServiceLastDate(new Date(item.lastDate));
    setServiceNextDate(new Date(item.nextDate));
    setServiceNote(item.note || '');
    setModalVisible(true);
  };

  const handleSaveService = () => {
    if (!serviceTitle || !serviceLastKm || !serviceNextKm) {
      Alert.alert('خطا', 'لطفاً عنوان و کیلومتر را وارد کنید');
      return;
    }
    const newService = {
      id: editingService ? editingService.id : Date.now().toString(),
      title: serviceTitle,
      lastKm: Number(serviceLastKm),
      nextKm: Number(serviceNextKm),
      lastDate: serviceLastDate.toISOString(),
      nextDate: serviceNextDate.toISOString(),
      note: serviceNote,
    };
    let newServices;
    if (editingService) {
      newServices = services.map(s => s.id === editingService.id ? newService : s);
    } else {
      newServices = [...services, newService];
    }
    saveServices(newServices);
    setModalVisible(false);
  };

  const handleDeleteService = (id) => {
    Alert.alert('حذف', 'آیا این سرویس حذف شود؟', [
      { text: 'انصراف' },
      { text: 'حذف', onPress: () => saveServices(services.filter(s => s.id !== id)) },
    ]);
  };

  const editCurrentKm = () => {
    Alert.prompt('ویرایش کیلومتر', 'کیلومتر فعلی را وارد کنید', [
      { text: 'انصراف' },
      {
        text: 'ذخیره',
        onPress: (value) => {
          const km = Number(value);
          if (!isNaN(km)) {
            setCurrentKm(km);
            onUpdateCar(car.id, km);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>🚗 {car.name}</Text>
            <TouchableOpacity onPress={() => onDeleteCar(car.id)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 22, color: 'red' }}>🗑️</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Text style={{ fontSize: 16 }}>📅 کیلومتر فعلی: {currentKm.toLocaleString()}</Text>
            <TouchableOpacity onPress={editCurrentKm} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {services.map((item) => (
          <View key={item.id} style={{ backgroundColor: getCardColor(item), borderRadius: 16, padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => openEditService(item)} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 18 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteService(item.id)} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text>📅 آخرین: {toJalaali(new Date(item.lastDate))} - {item.lastKm.toLocaleString()} کیلومتر</Text>
            <Text>⏳ موعد بعدی: {toJalaali(new Date(item.nextDate))} یا {item.nextKm.toLocaleString()} کیلومتر</Text>
            <Text style={{ fontWeight: 'bold', marginTop: 4 }}>{getStatusText(item)}</Text>
            {item.note ? <Text>📝 {item.note}</Text> : null}
          </View>
        ))}

        <TouchableOpacity
          onPress={openAddService}
          style={{ backgroundColor: '#1E4D6F', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>➕ افزودن سرویس جدید</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
              {editingService ? 'ویرایش سرویس' : 'سرویس جدید'}
            </Text>
            <TextInput placeholder="عنوان سرویس" value={serviceTitle} onChangeText={setServiceTitle} style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }} />
            <TextInput placeholder="کیلومتر آخرین بار" value={serviceLastKm} onChangeText={setServiceLastKm} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }} />
            <TextInput placeholder="کیلومتر بعدی" value={serviceNextKm} onChangeText={setServiceNextKm} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }} />
            <TouchableOpacity onPress={() => setShowLastPicker(true)} style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text>📅 تاریخ آخرین: {toJalaali(serviceLastDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNextPicker(true)} style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text>📅 تاریخ بعدی: {toJalaali(serviceNextDate)}</Text>
            </TouchableOpacity>
            <TextInput placeholder="یادداشت (اختیاری)" value={serviceNote} onChangeText={setServiceNote} multiline style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12, minHeight: 60 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ backgroundColor: '#CCC', padding: 12, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' }}><Text>انصراف</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveService} style={{ backgroundColor: '#1E4D6F', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' }}><Text style={{ color: 'white' }}>ذخیره</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showLastPicker && <DateTimePicker value={serviceLastDate} mode="date" display="default" onChange={(e, date) => { setShowLastPicker(false); if (date) setServiceLastDate(date); }} />}
      {showNextPicker && <DateTimePicker value={serviceNextDate} mode="date" display="default" onChange={(e, date) => { setShowNextPicker(false); if (date) setServiceNextDate(date); }} />}
    </SafeAreaView>
  );
};

// اپلیکیشن اصلی
export default function App() {
  const [cars, setCars] = useState([]);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    const saved = await getData('cars');
    if (saved && saved.length > 0) {
      setCars(saved);
    } else {
      const defaultCars = [
        { id: '1', name: 'Nissan Juke', currentKm: 25000 },
        { id: '2', name: 'BMW X3', currentKm: 18000 },
      ];
      setCars(defaultCars);
      await saveData('cars', defaultCars);
    }
  };

  const addCar = () => {
    Alert.prompt('خودرو جدید', 'نام خودرو را وارد کنید', [
      { text: 'انصراف' },
      {
        text: 'افزودن',
        onPress: (name) => {
          if (name && name.trim()) {
            const newCar = { id: Date.now().toString(), name: name.trim(), currentKm: 0 };
            const newCars = [...cars, newCar];
            saveData('cars', newCars);
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
    Alert.alert('حذف خودرو', 'آیا مطمئن هستید؟', [
      { text: 'انصراف' },
      {
        text: 'حذف',
        onPress: async () => {
          const newCars = cars.filter(c => c.id !== id);
          await saveData('cars', newCars);
          setCars(newCars);
          Alert.alert('موفق', 'خودرو حذف شد');
        },
      },
    ]);
  };

  const updateCarKm = (id, newKm) => {
    const newCars = cars.map(c => c.id === id ? { ...c, currentKm: newKm } : c);
    saveData('cars', newCars);
    setCars(newCars);
  };

  // اگر خودرویی وجود نداشت، یک صفحه خالی نشان بده
  if (cars.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>در حال بارگذاری...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ tabBarStyle: { backgroundColor: '#1E4D6F' }, tabBarIndicatorStyle: { backgroundColor: '#FF9800' }, tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', color: 'white' } }}>
        {cars.map(car => (
          <Tab.Screen key={car.id} name={car.name}>
            {() => <CarPage car={car} onDeleteCar={deleteCar} onUpdateCar={updateCarKm} />}
          </Tab.Screen>
        ))}
      </Tab.Navigator>
      <TouchableOpacity onPress={addCar} style={{ position: 'absolute', right: 20, bottom: 20, backgroundColor: '#1E4D6F', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>+</Text>
      </TouchableOpacity>
    </NavigationContainer>
  );
}