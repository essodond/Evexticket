import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export enum SeatStatus {
  Available = 'available',
  Selected = 'selected',
  Occupied = 'occupied',
  Empty = 'empty', // For visual spacing
}

interface Seat {
  id: string;
  status: SeatStatus;
  number: number;
}

interface SeatSelectionProps {
  seats: Seat[];
  onSeatPress: (seatId: string) => void;
  selectedSeatId: string | null;
}

const SeatSelection: React.FC<SeatSelectionProps> = ({ seats, onSeatPress, selectedSeatId }) => {
  const emptySeat: Seat = { id: 'empty', status: SeatStatus.Empty, number: 0 };

  const renderSeat = (seat: Seat) => {
    if (seat.status === SeatStatus.Empty) {
      return <View key={seat.id} style={styles.emptySeat} />;
    }
    const isSelected = seat.id === selectedSeatId;
    return (
      <TouchableOpacity
        key={seat.id}
        style={[
          styles.seat,
          isSelected && styles.selectedSeat,
          seat.status === SeatStatus.Occupied && styles.occupiedSeat,
        ]}
        onPress={() => onSeatPress(seat.id)}
        disabled={seat.status === SeatStatus.Occupied}
      >
        <Text style={styles.seatText}>{seat.number}</Text>
      </TouchableOpacity>
    );
  };

  // Sort seats by number to ensure correct placement
  const sortedSeats = [...seats].sort((a, b) => a.number - b.number);

  // Assign seats to their respective sections based on the user's description
  // Seat 1 is now a passenger seat in the first row
  const frontRowSeats = sortedSeats.filter(s => s.number >= 1 && s.number <= 4); // Seats 1, 2, 3, 4

  const mainBodySeatsFirstSection = sortedSeats.filter(s => s.number >= 5 && s.number <= 24); // Seats 5-24
  const middleDoorSeatsRow = sortedSeats.filter(s => s.number >= 25 && s.number <= 26); // Seats 25-26
  const mainBodySeatsSecondSection = sortedSeats.filter(s => s.number >= 27 && s.number <= 46); // Seats 27-46

  // Rear seats (47, 48, 49, 50)
  const rearSeats = sortedSeats.filter(s => s.number >= 47 && s.number <= 50);

  // Create rows for the main body first section (2-2 configuration)
  const mainBodyRowsFirstSection = [];
  for (let i = 0; i < mainBodySeatsFirstSection.length; i += 4) {
    mainBodyRowsFirstSection.push(mainBodySeatsFirstSection.slice(i, i + 4));
  }

  // Create rows for the main body second section (2-2 configuration)
  const mainBodyRowsSecondSection = [];
  for (let i = 0; i < mainBodySeatsSecondSection.length; i += 4) {
    mainBodyRowsSecondSection.push(mainBodySeatsSecondSection.slice(i, i + 4));
  }


  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Driver's Section and Front Door */}
      <View style={styles.busFront}>
        <View style={styles.driverArea}>
```
          <Text style={styles.driverText}>Driver</Text> {/* Driver's position */}
        </View>
        <View style={styles.frontDoor}><Text style={styles.doorText}>Porte Avant</Text></View>
```
      </View>

      {/* First Row after driver (Seats 1, 2, 3, 4) */}
      <View style={styles.seatRow}>
        {renderSeat(frontRowSeats[0] || emptySeat)} {/* Seat 1 */}
        {renderSeat(frontRowSeats[1] || emptySeat)} {/* Seat 2 */}
        <View style={styles.aisleSpacer} />
        {renderSeat(frontRowSeats[2] || emptySeat)} {/* Seat 3 */}
        {renderSeat(frontRowSeats[3] || emptySeat)} {/* Seat 4 */}
      </View>

      {/* Main Body Seating first section (2-2 configuration) */}
      {mainBodyRowsFirstSection.map((row, rowIndex) => (
        <View key={`main-row-first-${rowIndex}`} style={styles.seatRow}>
          {renderSeat(row[0] || emptySeat)}
          {renderSeat(row[1] || emptySeat)}
          <View style={styles.aisleSpacer} />
          {renderSeat(row[2] || emptySeat)}
          {renderSeat(row[3] || emptySeat)}
        </View>
      ))}

      {/* Seats 25-26 and the Middle Door */}
      <View style={styles.seatRow}>
        {renderSeat(middleDoorSeatsRow[0] || emptySeat)} {/* Seat 25 */}
        {renderSeat(middleDoorSeatsRow[1] || emptySeat)} {/* Seat 26 */}
        <View style={styles.aisleSpacer} /> {/* Aisle spacer */}
        <View style={styles.middleDoorAisle}><Text style={styles.doorText}>Middle Door</Text></View>
      </View>

      {/* Main Body Seating second section (2-2 configuration) */}
      {mainBodyRowsSecondSection.map((row, rowIndex) => (
        <View key={`main-row-second-${rowIndex}`} style={styles.seatRow}>
          {renderSeat(row[0] || emptySeat)}
          {renderSeat(row[1] || emptySeat)}
          <View style={styles.aisleSpacer} />
          {renderSeat(row[2] || emptySeat)}
          {renderSeat(row[3] || emptySeat)}
        </View>
      ))}

      {/* Rear Seats (Seats 47, 48, 49, 50) - single row without aisle */}
      <View style={styles.rearSectionFullWidth}> {/* New style for full width rear section */}
        {renderSeat(rearSeats[0] || emptySeat)}
        {renderSeat(rearSeats[1] || emptySeat)}
        {renderSeat(rearSeats[2] || emptySeat)}
        {renderSeat(rearSeats[3] || emptySeat)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Light background for the bus interior
    flexGrow: 1,
  },
  busFront: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    alignItems: 'flex-end', // Align driver seat to bottom of its container
  },
  driverArea: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '50%', // Adjust as needed
    paddingLeft: 10, // Add some padding for the driver text
  },
  driverText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'flex-end', // Align text to the bottom
    marginBottom: 5, // Small margin to lift it slightly
  },
  frontDoor: {
    backgroundColor: '#d3d3d3',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '40%', // Adjust as needed
    height: 50,
    marginRight: 10,
  },
  middleDoorAisle: {
    backgroundColor: '#d3d3d3',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100, // Smaller width for the door in the aisle
    height: 45,
    marginVertical: 8, // Adjust vertical margin to fit between rows
  },
  doorText: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  seat: {
    width: 45,
    height: 45,
    margin: 4,
    backgroundColor: '#87CEEB', // SkyBlue for available
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4682B4', // SteelBlue
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  selectedSeat: {
    backgroundColor: '#4CAF50',
  },
  occupiedSeat: {
    backgroundColor: '#D3D3D3', // Light gray for occupied seats
    borderColor: '#A9A9A9', // Dark gray border
  },
  emptySeat: {
    width: 45,
    height: 45,
    margin: 4,
    backgroundColor: 'transparent',
  },
  aisleSpacer: {
    width: 30, // Aisle width
    height: 45,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  seatText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rearSection: { // This style is for the old rear section, I'll keep it for now but won't use it.
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 15,
    marginBottom: 20,
  },
  rearSectionFullWidth: { // New style for the full width rear section
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 15,
    marginBottom: 20,
    // No aisle spacer here, so seats are close together
  },
});

export default SeatSelection;