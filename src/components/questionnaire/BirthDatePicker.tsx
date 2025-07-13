import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface BirthDatePickerProps {
  date?: { year: string; month: string; day: string; } | null; // ADDED: To pre-select specific date
  onDateChange: (details: { year: string; month: string; day: string; age: number }) => void; // MODIFIED
  minAge?: number;
  maxAge?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH = CURRENT_DATE.getMonth(); // 0-indexed
const CURRENT_DAY = CURRENT_DATE.getDate();
const MIN_PICKER_YEAR = 1940;
const MAX_PICKER_YEAR = 2030;

const BirthDatePicker: React.FC<BirthDatePickerProps> = ({ 
  date,
  onDateChange,
  minAge = 4, // Minimum age allowed by current validation
  maxAge = 99  // Maximum age allowed by current validation
}) => {
  const getDefaultYear = () => {
    // Default to current year (today's date)
    return CURRENT_YEAR;
  };
  
  const getDefaultMonth = () => CURRENT_MONTH; // Current month (0-indexed)
  const getDefaultDay = () => CURRENT_DAY;     // Current day

  const [selectedYear, setSelectedYear] = useState<string>(
    date?.year || String(getDefaultYear())
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    date?.month || String(getDefaultMonth())
  );
  const [selectedDay, setSelectedDay] = useState<string>(
    date?.day || String(getDefaultDay())
  );

  const [days, setDays] = useState<number[]>([]);
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  // Generate years for the picker from MIN_PICKER_YEAR up to MAX_PICKER_YEAR
  const years = Array.from({ length: MAX_PICKER_YEAR - MIN_PICKER_YEAR + 1 }, (_, i) => MIN_PICKER_YEAR + i);

  const selfTriggeredUpdate = useRef(false);
  // const initialSetupDone = useRef(false); // No longer strictly needed in the same way

  // Effect to update days in month when year or month changes (internal picker logic)
  useEffect(() => {
    const numericYear = parseInt(selectedYear, 10);
    const numericMonth = parseInt(selectedMonth, 10);
    if (isNaN(numericYear) || isNaN(numericMonth)) return;

    const numDays = daysInMonth(numericYear, numericMonth);
    setDays(Array.from({ length: numDays }, (_, i) => i + 1));

    const numericDay = parseInt(selectedDay, 10);
    if (numericDay > numDays) {
      setSelectedDay(String(numDays)); // Adjust day if it becomes invalid for new month/year
    }
  }, [selectedYear, selectedMonth]);

  // Effect to sync with 'date' prop from parent if it changes externally
  useEffect(() => {
    if (selfTriggeredUpdate.current) {
      selfTriggeredUpdate.current = false; // Reset flag after an internal update call
      return;
    }
    if (date) {
      if (date.year !== selectedYear) setSelectedYear(date.year);
      if (date.month !== selectedMonth) setSelectedMonth(date.month);
      if (date.day !== selectedDay) setSelectedDay(date.day);
    } else {
      // If date prop is cleared (e.g. null), reset to defaults
      // This might be desired if parent wants to "reset" the picker
      setSelectedYear(String(getDefaultYear()));
      setSelectedMonth(String(getDefaultMonth()));
      setSelectedDay(String(getDefaultDay()));
    }
  }, [date]); // React to changes in the date prop

  // Effect to calculate and propagate age when D/M/Y changes by user OR by prop sync
  useEffect(() => {
    const numericYear = parseInt(selectedYear, 10);
    const numericMonth = parseInt(selectedMonth, 10);
    const numericDay = parseInt(selectedDay, 10);

    if (isNaN(numericYear) || isNaN(numericMonth) || isNaN(numericDay)) {
        // This can happen briefly during initialization if defaults are somehow invalid
        // or if parsing fails. Consider if an early return is always safe or if
        // onDateChange should be called with an "invalid" state.
        // For now, return to avoid calling onDateChange with NaN values.
        return;
    }

    const birthDate = new Date(numericYear, numericMonth, numericDay);
    // Basic validation: Ensure the date itself is valid (e.g. Feb 30th would be adjusted by Date constructor)
    // We might not need explicit checks here if Date object handles it, but good to be aware.

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // The parent component (QuestionnaireScreen) is responsible for validating the calculated 'age'
    // against its own minAge/maxAge business logic. This component just reports what was selected.

    selfTriggeredUpdate.current = true; // Set flag before calling parent
    onDateChange({
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        age: age
    });

  }, [selectedYear, selectedMonth, selectedDay, onDateChange]); // Note: onDateChange in deps

  const commonPickerProps = Platform.select({
    ios: {
      itemStyle: styles.iosPickerItem,
    },
    android: {
      style: styles.androidPicker, 
    },
  });

  const renderNumericPickerItems = (items: number[]) => {
    return items.map((item) => (
      <Picker.Item 
        key={String(item)} 
        label={String(item)} 
        value={String(item)} 
        style={Platform.OS === 'android' ? styles.androidPickerItem : undefined}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthPickerColumn}> 
        <Picker
          selectedValue={selectedMonth} 
          onValueChange={(itemValue) => setSelectedMonth(itemValue as string)}
          style={styles.pickerStyle}
          {...commonPickerProps}
        >
          {MONTHS.map((month, index) => (
            <Picker.Item 
              key={month} 
              label={month} 
              value={String(index)} 
              style={Platform.OS === 'android' ? styles.androidPickerItem : undefined}
            />
          ))}
        </Picker>
      </View>
      <View style={styles.dayPickerColumn}>
        <Picker
          selectedValue={selectedDay} 
          onValueChange={(itemValue) => setSelectedDay(itemValue as string)}
          style={styles.pickerStyle}
          {...commonPickerProps}
        >
          {renderNumericPickerItems(days)}
        </Picker>
      </View>
      <View style={styles.yearPickerColumn}>
        <Picker
          selectedValue={selectedYear} 
          onValueChange={(itemValue) => setSelectedYear(itemValue as string)}
          style={styles.pickerStyle}
          {...commonPickerProps}
        >
          {renderNumericPickerItems(years)}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 70, 
    height: Platform.OS === 'ios' ? 210 : 170, // Reduced overall height
  },
  monthPickerColumn: { 
    flex: 3.0, // Narrower
    height: '100%', 
  },
  dayPickerColumn: { 
    flex: 1.8, // Wider
    height: '100%',
  },
  yearPickerColumn: { 
    flex: 2.3, // Wider
    height: '100%',
  },
  pickerStyle: { 
    height: '100%',
    width: '100%',
  },
  iosPickerItem: { 
    fontSize: 17,
    color: '#000000', 
    height: 250, // Attempt to make the selection indicator visually shorter
  },
  androidPicker: { 
    backgroundColor: 'transparent',
  },
  androidPickerItem: { 
    fontSize: 17,
    color: '#333333',
  },
});

export default BirthDatePicker; 