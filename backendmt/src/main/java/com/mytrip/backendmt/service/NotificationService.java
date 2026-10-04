package com.mytrip.backendmt.service;

import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.entity.TripMember;
import com.mytrip.backendmt.entity.User;
import com.mytrip.backendmt.repository.TripRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.whatsapp.number}")
    private String fromWhatsAppNumber;

    @Autowired
    private TripRepository tripRepository;

    @PostConstruct
    public void initTwilio() {
        Twilio.init(accountSid, authToken);
    }

    @Async
    public void notifyMembersOnExpense(Expense expense) {
        // Get trip directly from expense, or via its ID if not fully loaded:
        Trip trip = expense.getTrip();
        if (trip == null && expense.getTrip() != null) {
            trip = tripRepository.findById(expense.getTrip().getId()).orElse(null);
        }
        if (trip == null || trip.getMembers() == null) return;

        double sharePerPerson = Math.round((expense.getAmount() / trip.getMembers().size()) * 100.0) / 100.0;

        String body = String.format(
                "📢 *Tour Expense Alert* [%s]\n" +
                        "Expense: %s\n" +
                        "Amount: ₹%.2f\n" +
                        "Paid by: %s\n" +
                        "Your Split: ₹%.2f\n" +
                        "Mode: %s",
                trip.getTitle(),
                expense.getTitle(),
                expense.getAmount(),
                expense.getPaidBy(),
                sharePerPerson,
                expense.getPaymentMode()
        );

        for (TripMember member : trip.getMembers()) {
            if (member.getMobileNumber() == null || member.getMobileNumber().isBlank()) {
                continue;
            }

            // Ensure E.164 country code format (defaulting to +91 if missing)
            String rawPhone = member.getMobileNumber().trim();
            String formattedPhone = rawPhone.startsWith("+") ? rawPhone : "+91" + rawPhone;

            try {
                // Send WhatsApp message
                Message.creator(
                        new PhoneNumber("whatsapp:" + formattedPhone),
                        new PhoneNumber(fromWhatsAppNumber),
                        body
                ).create();
            } catch (Exception e) {
                System.err.println("Failed to send WhatsApp alert to " + member.getMobileNumber() + ": " + e.getMessage());
            }
        }
    }
}