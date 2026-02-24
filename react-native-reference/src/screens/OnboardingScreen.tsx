import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Voyagez en toute sérénité',
    description: 'Réservez vos billets de bus en quelques clics et voyagez à travers tout le Togo.',
    image: 'https://i.pinimg.com/1200x/e9/cd/9f/e9cd9fdd26dd8c095795557dd97f2faf.jpg',
  },
  {
    id: '2',
    title: 'Découvrez le Togo',
    description: 'Des destinations multiples, des prix transparents, un service fiable.',
    image: 'https://images.unsplash.com/photo-1710074987341-a05470a5de2f?w=800',
  },
  {
    id: '3',
    title: 'Paiement sécurisé',
    description: 'Payez facilement avec Flooz, TMoney ou carte bancaire.',
    image: 'https://images.unsplash.com/photo-1731135227461-b5d5e709f0cf?w=800',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem('hasLaunched', 'true');
      navigation.replace('PublicHome');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasLaunched', 'true');
    navigation.replace('PublicHome');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = ({ item }: any) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dot_active,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {currentIndex < slides.length - 1 && (
            <Button
              title="Passer"
              onPress={handleSkip}
              variant="ghost"
              style={styles.skipButton}
            />
          )}
          <Button
            title={currentIndex < slides.length - 1 ? 'Suivant' : 'Commencer'}
            onPress={handleNext}
            style={styles.nextButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  slide: {
    width,
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
    marginHorizontal: 4,
  },
  dot_active: {
    width: 32,
    backgroundColor: COLORS.primary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
  },
});
