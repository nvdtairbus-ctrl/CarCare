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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Provider as PaperProvider, Card, Button, FAB } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as jalaali from 'jalaali-js';

const Tab = createMaterialTopTabNavigator();

// ========== توابع کمکی ==========
const toJalaali = (date) => {
  const jd = jalaali.toJalaali(date);
  return `${jd.jy}/${String(jd.jm).padStart(2, '0')}/${String(jd.jd).padStart(2, '0')}`;
};

const saveData = async (key, data) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

const loadData = async (key) => {
  const json = await AsyncStorage.getItem(key);
  return json ? JSON.parse(json) : [];
};

// محاسبه رنگ و وضعیت
const getStatus = (lastDate, nextDate, lastKm, nextKm, currentKm) => {
  const today = new Date();
  const next = new Date(nextDate);
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  const kmRemaining = nextKm - currentKm;
  const kmPercent = kmRemaining <= 0 ? 100 : ((nextKm - lastKm) - kmRemaining) / (nextKm - lastKm) * 100;

  if (diffDays <= 0 && kmRemaining <= 0) return { color: '#FFCDD2', text: '🔥 منقضی شده' };
  if (diffDays <= 15 || kmPercent >= 85) return { color: '#FFCDD2', text: '🔴 فوری' };
  if (diffDays <= 45 || kmPercent >= 60) return { color: '#FFE0B2', text: '🟠 نزدیک است' };
  return { color: '#C8E6C9', text: '✅ عادی' };
};

// ========== صفحه سرویس‌های هر خودرو ==========
const CarScreen = ({ car, onUpdate, onDeleteCar }) => {
  const [services, setServices] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [lastKm, setLastKm] = useState('');
  const [nextKm, setNextKm] = useState('');
  const [lastDate, setLastDate] = useState(new Date());
  const [nextDate, setNextDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [currentKm, setCurrentKm] = useState(car.currentKm);
  const [showLastPicker, setShowLastPicker] = useState(false);
  const [showNextPicker, setShowNextPicker] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const data = await loadData(`car_${car.id}_services`);
    setServices(data);
  };

  const saveServices = async (newData) => {
    await saveData(`car_${car.id}_services`, newData);
    setServices(newData);
  };

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setLastKm('');
    setNextKm('');
    setLastDate(new Date());
    setNextDate(new Date());
    setNote('');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setLastKm(item.lastKm.toString());
    setNextKm(item.nextKm.toString());
    setLastDate(new Date(item.lastDate));
    setNextDate(new Date(item.nextDate));
    setNote(item.note);
    setModalVisible(true);
  };

  const saveService = () => {
    if (!title || !lastKm || !nextKm) {
      Alert.alert('خطا', 'لطفاً عنوان و کیلومتر را وارد کنید');
      return;
    }

    const newService = {
      id: editingId || Date.now().toString(),
      title,
      lastKm: parseInt(lastKm),
      nextKm: parseInt(nextKm),
      lastDate: lastDate.toISOString(),
      nextDate: nextDate.toISOString(),
      note,
    };

    let newServices;
    if (editingId) {
      newServices = services.map(s => s.id === editingId ? newService : s);
    } else {
      newServices = [...services, newService];
    }
    saveServices(newServices);
    setModalVisible(false);
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
            onUpdate(car.id, km);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const status = getStatus(item.lastDate, item.nextDate, item.lastKm, item.nextKm, currentKm);
    return (
      <Card style={{ marginBottom: 12, backgroundColor: status.color, borderRadius: 16 }}>
        <Card.Content>
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
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA', padding: 12 }}>
      <FlatList
        data={services}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <Card style={{ marginBottom: 16, borderRadius: 20 }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>🚗 {car.name}</Text>
                <TouchableOpacity onPress={() => onDeleteCar(car.id)} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 18, color: 'red' }}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Text>📅 کیلومتر فعلی: {currentKm.toLocaleString()} کیلومتر</Text>
                <TouchableOpacity onPress={updateCurrentKm} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 18 }}>✏️</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        }
        ListFooterComponent={
          <Button mode="contained" onPress={openAddModal} style={{ marginVertical: 10, borderRadius: 12 }}>
            ➕ افزودن سرویس جدید
          </Button>
        }
      />

      {/* مودال افزودن/ویرایش سرویس */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <ScrollView style={{ backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
              {editingId ? 'ویرایش سرویس' : 'سرویس جدید'}
            </Text>

            <TextInput
              placeholder="عنوان سرویس (مثال: تعویض روغن)"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <TextInput
              placeholder="کیلومتر آخرین بار"
              placeholderTextColor="#999"
              value={lastKm}
              onChangeText={setLastKm}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              placeholder="کیلومتر بعدی"
              placeholderTextColor="#999"
              value={nextKm}
              onChangeText={setNextKm}
              keyboardType="numeric"
              style={styles.input}
            />

            <TouchableOpacity onPress={() => setShowLastPicker(true)} style={styles.dateButton}>
              <Text>📅 تاریخ آخرین: {toJalaali(lastDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowNextPicker(true)} style={styles.dateButton}>
              <Text>📅 تاریخ بعدی: {toJalaali(nextDate)}</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="یادداشت (اختیاری)"
              placeholderTextColor="#999"
              value={note}
              onChangeText={setNote}
              multiline
              style={[styles.input, { minHeight: 60 }]}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Button onPress={() => setModalVisible(false)}>انصراف</Button>
              <Button mode="contained" onPress={saveService}>ذخیره</Button>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {showLastPicker && (
        <DateTimePicker
          value={lastDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowLastPicker(false);
            if (date) setLastDate(date);
          }}
        />
      )}

      {showNextPicker && (
        <DateTimePicker
          value={nextDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowNextPicker(false);
            if (date) setNextDate(date);
          }}
        />
      )}
    </View>
  );
};

const styles = {
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
};

// ========== اپلیکیشن اصلی ==========
export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    let saved = await loadData('cars');
    if (saved.length === 0) {
      saved = [
        { id: '1', name: 'Nissan Juke', plate: '', currentKm: 25000 },
        { id: '2', name: 'BMW X3', plate: '', currentKm: 18000 },
      ];
      await saveData('cars', saved);
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
              plate: '',
              currentKm: 0,
            };
            const newCars = [...cars, newCar];
            saveData('cars', newCars);
            setCars(newCars);
            Alert.alert('موفق', 'خودرو با موفقیت اضافه شد');
          } else {
            Alert.alert('خطا', 'لطفاً نام خودرو را وارد کنید');
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
        style: 'destructive',
        onPress: async () => {
          const newCars = cars.filter(car => car.id !== id);
          await saveData('cars', newCars);
          setCars(newCars);
          Alert.alert('موفق', 'خودرو حذف شد');
        },
      },
    ]);
  };

  const updateCarKm = (id, newKm) => {
    const newCars = cars.map(car => car.id === id ? { ...car, currentKm: newKm } : car);
    saveData('cars', newCars);
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
    <PaperProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: '#1E4D6F' },
            tabBarIndicatorStyle: { backgroundColor: '#FF9800' },
            tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', color: 'white' },
          }}
        >
          {cars.map(car => (
            <Tab.Screen 
              key={car.id} 
              name={car.name}
              listeners={{
                tabLongPress: () => deleteCar(car.id),
              }}
            >
              {() => <CarScreen car={car} onUpdate={updateCarKm} onDeleteCar={deleteCar} />}
            </Tab.Screen>
          ))}
        </Tab.Navigator>
      </NavigationContainer>

      {/* دکمه افزودن خودرو جدید - پایین سمت راست */}
      <FAB
        icon="plus"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          backgroundColor: '#1E4D6F',
        }}
        color="white"
        onPress={addCar}
      />
    </PaperProvider>
  );
}