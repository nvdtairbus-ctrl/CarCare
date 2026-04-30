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
import { Provider as PaperProvider, Card, Button, IconButton, FAB } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as jalaali from 'jalaali-js';

const Tab = createMaterialTopTabNavigator();

// تبدیل تاریخ میلادی به شمسی
const toJalaali = (date) => {
  const jd = jalaali.toJalaali(date);
  return `${jd.jy}/${String(jd.jm).padStart(2, '0')}/${String(jd.jd).padStart(2, '0')}`;
};

// ذخیره و بارگذاری
const saveData = async (key, data) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};
const loadData = async (key) => {
  const json = await AsyncStorage.getItem(key);
  return json ? JSON.parse(json) : [];
};

// وضعیت رنگ بر اساس تاریخ و کیلومتر
const getStatus = (lastDate, nextDate, lastKm, nextKm, currentKm) => {
  const today = new Date();
  const next = new Date(nextDate);
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  const kmRemaining = nextKm - currentKm;
  const kmDonePercent = ((nextKm - lastKm) - kmRemaining) / (nextKm - lastKm) * 100;

  if (diffDays <= 0 && kmRemaining <= 0) return { color: '#FFCDD2', text: '🔥 منقضی شده!', days: diffDays, km: kmRemaining };
  if (diffDays <= 15 || kmDonePercent >= 85) return { color: '#FFCDD2', text: '🔴 فوری!', days: diffDays, km: kmRemaining };
  if (diffDays <= 45 || kmDonePercent >= 60) return { color: '#FFE0B2', text: '🟠 نزدیک است', days: diffDays, km: kmRemaining };
  return { color: '#C8E6C9', text: '✅ عادی', days: diffDays, km: kmRemaining };
};

const CarScreen = ({ car, onCarUpdate }) => {
  const [services, setServices] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [title, setTitle] = useState('');
  const [lastDate, setLastDate] = useState(new Date());
  const [nextDate, setNextDate] = useState(new Date());
  const [lastKm, setLastKm] = useState('');
  const [nextKm, setNextKm] = useState('');
  const [note, setNote] = useState('');
  const [currentKm, setCurrentKm] = useState(car.currentKm);
  const [showLastDatePicker, setShowLastDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (currentKm !== car.currentKm) {
      onCarUpdate(car.id, currentKm);
    }
  }, [currentKm]);

  const loadServices = async () => {
    const saved = await loadData(`car_${car.id}_services`);
    setServices(saved);
  };

  const saveServices = async (newServices) => {
    await saveData(`car_${car.id}_services`, newServices);
    setServices(newServices);
  };

  const addService = () => {
    setCurrentService(null);
    setTitle('');
    setLastDate(new Date());
    setNextDate(new Date());
    setLastKm('');
    setNextKm('');
    setNote('');
    setModalVisible(true);
  };

  const editService = (service) => {
    setCurrentService(service);
    setTitle(service.title);
    setLastDate(new Date(service.lastDate));
    setNextDate(new Date(service.nextDate));
    setLastKm(service.lastKm.toString());
    setNextKm(service.nextKm.toString());
    setNote(service.note);
    setModalVisible(true);
  };

  const saveService = () => {
    if (!title || !lastKm || !nextKm) {
      Alert.alert('خطا', 'لطفاً عنوان و کیلومتر را وارد کنید');
      return;
    }
    const newService = {
      id: currentService?.id || Date.now().toString(),
      title,
      lastDate: lastDate.toISOString(),
      nextDate: nextDate.toISOString(),
      lastKm: parseInt(lastKm),
      nextKm: parseInt(nextKm),
      note,
    };
    let newServices;
    if (currentService) {
      newServices = services.map(s => s.id === currentService.id ? newService : s);
    } else {
      newServices = [...services, newService];
    }
    saveServices(newServices);
    setModalVisible(false);
  };

  const deleteService = (id) => {
    Alert.alert('حذف', 'آیا این آیتم حذف شود؟', [
      { text: 'انصراف' },
      { text: 'حذف', onPress: () => saveServices(services.filter(s => s.id !== id)) },
    ]);
  };

  const renderService = ({ item }) => {
    const status = getStatus(item.lastDate, item.nextDate, item.lastKm, item.nextKm, currentKm);
    return (
      <Card style={{ marginBottom: 12, backgroundColor: status.color, borderRadius: 16, elevation: 2 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="pencil" size={20} onPress={() => editService(item)} />
              <IconButton icon="delete" size={20} onPress={() => deleteService(item.id)} />
            </View>
          </View>
          <Text>📅 آخرین: {toJalaali(new Date(item.lastDate))} - {item.lastKm.toLocaleString()} کیلومتر</Text>
          <Text>⏳ موعد بعدی: {toJalaali(new Date(item.nextDate))} یا {item.nextKm.toLocaleString()} کیلومتر</Text>
          <Text style={{ fontWeight: 'bold', marginTop: 4 }}>{status.text}</Text>
          {status.days > 0 && status.days < 100 && <Text>⏰ {status.days} روز باقی مانده</Text>}
          {status.km > 0 && status.km < 20000 && <Text>📊 {status.km.toLocaleString()} کیلومتر تا موعد</Text>}
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
        renderItem={renderService}
        ListHeaderComponent={
          <Card style={{ marginBottom: 16, borderRadius: 20, elevation: 4 }}>
            <Card.Content>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>🚗 {car.name}</Text>
              <Text>پلاک: {car.plate}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ flex: 1 }}>📅 کیلومتر فعلی: {currentKm.toLocaleString()} کیلومتر</Text>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => {
                    Alert.prompt('ویرایش کیلومتر', 'کیلومتر فعلی خودرو را وارد کنید', [
                      { text: 'انصراف' },
                      {
                        text: 'ذخیره',
                        onPress: (value) => {
                          const km = parseInt(value);
                          if (!isNaN(km)) setCurrentKm(km);
                        },
                      },
                    ]);
                  }}
                />
              </View>
            </Card.Content>
          </Card>
        }
        ListFooterComponent={
          <Button mode="contained" onPress={addService} style={{ marginVertical: 10, borderRadius: 12 }}>
            ➕ افزودن سرویس جدید
          </Button>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <ScrollView style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
              {currentService ? 'ویرایش سرویس' : 'سرویس جدید'}
            </Text>
            <TextInput 
              placeholder="عنوان (مثلاً تعویض روغن)" 
              value={title} 
              onChangeText={setTitle} 
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 }}
            />
            <TextInput 
              placeholder="کیلومتر آخرین بار" 
              value={lastKm} 
              onChangeText={setLastKm} 
              keyboardType="numeric" 
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 }}
            />
            <TextInput 
              placeholder="کیلومتر下次" 
              value={nextKm} 
              onChangeText={setNextKm} 
              keyboardType="numeric" 
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 }}
            />
            <TouchableOpacity 
              onPress={() => setShowLastDatePicker(true)} 
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text>📅 تاریخ آخرین: {toJalaali(lastDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowNextDatePicker(true)} 
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text>📅 تاریخ下次: {toJalaali(nextDate)}</Text>
            </TouchableOpacity>
            <TextInput 
              placeholder="یادداشت (اختیاری)" 
              value={note} 
              onChangeText={setNote} 
              multiline 
              style={{ borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, marginBottom: 12, minHeight: 60, fontSize: 14 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Button onPress={() => setModalVisible(false)}>انصراف</Button>
              <Button mode="contained" onPress={saveService}>ذخیره</Button>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {showLastDatePicker && (
        <DateTimePicker
          value={lastDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowLastDatePicker(false);
            if (date) setLastDate(date);
          }}
        />
      )}
      {showNextDatePicker && (
        <DateTimePicker
          value={nextDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowNextDatePicker(false);
            if (date) setNextDate(date);
          }}
        />
      )}
    </View>
  );
};

export default function App() {
  const [cars, setCars] = useState([]);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    let saved = await loadData('cars');
    if (saved.length === 0) {
      saved = [
        { id: '1', name: 'پژو ۲۰۶', plate: '۱۲۳-۴۵۶-۷۸۹', currentKm: 45200 },
        { id: '2', name: 'پراید ۱۱۱', plate: '۹۸۷-۶۵۴-۳۲۱', currentKm: 120000 },
      ];
      await saveData('cars', saved);
    }
    setCars(saved);
  };

  const addCar = () => {
    Alert.prompt('خودرو جدید', 'نام خودرو را وارد کنید', [
      { text: 'انصراف' },
      {
        text: 'افزودن',
        onPress: (name) => {
          if (name) {
            const newCar = {
              id: Date.now().toString(),
              name,
              plate: 'نامشخص',
              currentKm: 0,
            };
            const newCars = [...cars, newCar];
            saveData('cars', newCars);
            setCars(newCars);
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
        },
      },
    ]);
  };

  const updateCarKm = (id, newKm) => {
    const newCars = cars.map(car => car.id === id ? { ...car, currentKm: newKm } : car);
    saveData('cars', newCars);
    setCars(newCars);
  };

  return (
    <PaperProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarStyle: { backgroundColor: '#1E4D6F' },
            tabBarIndicatorStyle: { backgroundColor: '#FF9800' },
            tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', color: 'white' },
            tabBarIcon: ({ focused }) => null,
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onLongPress={() => deleteCar(route.key.split('-')[1])}
                delayLongPress={500}
              />
            ),
          })}
        >
          {cars.map(car => (
            <Tab.Screen 
              key={car.id} 
              name={car.name}
              listeners={{
                tabLongPress: () => deleteCar(car.id),
              }}
            >
              {() => <CarScreen car={car} onCarUpdate={updateCarKm} />}
            </Tab.Screen>
          ))}
        </Tab.Navigator>
      </NavigationContainer>
      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: '#1E4D6F' }}
        onPress={addCar}
        color="white"
      />
    </PaperProvider>
  );
}