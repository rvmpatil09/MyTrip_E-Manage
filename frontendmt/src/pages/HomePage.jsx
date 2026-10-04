import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const SHOWCASE_SLIDES = [
  {
    title: 'Bring Your Trio to the Trip',
    subtitle: 'Plan group trips, schedule stays, and track targets seamlessly.',
    tag: 'Group Exploration',
    image: 'https://akm-img-a-in.tosshub.com/indiatoday/images/story/201904/trip.png?VersionId=Ldo8xU3fwiE7hIXXtmQDor.ySMPAWvUN&size=690:388',
  },
  {
    title: 'Rancho is Calling You to Shimla',
    subtitle: 'Watch individual contributions aggregate and track live balances.',
    tag: 'Automated Pool',
    image: 'https://www.savaari.com/blog/wp-content/uploads/2023/08/3_idiots_IMDb1.webp',
  },
  {
    title: 'Time Pe Trip Cancel Karna is Not Funny',
    subtitle: 'Greedy algorithms determine exact member-to-member balances without disputes.',
    tag: 'Optimal Settlements',
    image: 'https://www.deccanchronicle.com/h-upload/2024/07/20/1825452-whatsappimage2024-07-19at52533pm.webp',
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = () => {
    fetch('http://localhost:8080/api/trips?_t=' + Date.now())
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const rawTrips = Array.isArray(data) ? data : [];

        // Sort descending by ID: Most recently created trips appear first
        const sorted = rawTrips.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        setTrips(sorted);
      })
      .catch((err) => console.error('Failed to load trips:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const fetchTrips = async () => {
      const token = localStorage.getItem('trip_token');
      
      if (!token) {
        console.warn("No trip_token found in localStorage");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('http://localhost:8080/api/trips', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        setTrips(data);
      } catch (err) {
        console.error("Failed to load user trips:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);
  // Delete trip directly from the dashboard card
  // 1. Get current user credentials
  const currentEmail = localStorage.getItem('email');
  const userRole = localStorage.getItem('role');
  const isAdmin = userRole === 'ROLE_ADMIN';

  // 2. Delete Handler Function
  const handleDeleteTrip = async (e, tripId, tripTitle) => {
    e.stopPropagation(); // Prevents clicking the card link

    if (!window.confirm(`Are you sure you want to delete the trip "${tripTitle}"?`)) {
      return;
    }

    const token = localStorage.getItem('trip_token') || localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:8080/api/trips/${tripId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Failed to delete (HTTP ${res.status})`);
      }

      // Remove from local UI state
      setTrips((prevTrips) => prevTrips.filter((t) => t.id !== tripId));
    } catch (err) {
      alert(err.message || 'Error deleting trip');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-csk-blueDark text-slate-800 dark:text-slate-100 pb-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">

        {/* 1. Dynamic Interactive Showcase Carousel */}
        <section className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-950">
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            loop={true}
            speed={800}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="w-full h-80 sm:h-[430px]"
          >
            {SHOWCASE_SLIDES.map((slide, idx) => (
              <SwiperSlide key={idx} className="relative w-full h-full">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center brightness-75 transition-all duration-700"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent">
                  <span className="w-fit text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-csk-yellow text-csk-blue mb-2 shadow">
                    {slide.tag}
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-sm">
                    {slide.title}
                  </h2>
                  <p className="text-xs sm:text-base text-slate-200 max-w-xl mt-1 font-medium drop-shadow-sm">
                    {slide.subtitle}
                  </p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* 2. Interactive Guide Action Banner */}
        <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-csk-blue via-slate-900 to-slate-950 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-6 shadow-xl border border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-csk-yellow">
              {t('planNewTour', 'Plan New Tour')}
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-1">Ready to start a new adventure?</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Set target budgets, invite group members, and track expenditures transparently from start to finish.
            </p>
          </div>
          <button
            onClick={() => navigate('/create-trip')}
            className="px-6 py-3.5 rounded-xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition transform active:scale-95 whitespace-nowrap"
          >
            {t('newTrip', '+ New Trip')}
          </button>
        </section>

        {/* 3. Persisted Trips Database Grid - Most Recently Created First */}
        <section className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg sm:text-xl font-black text-csk-blue dark:text-csk-yellow uppercase tracking-wide">
              {t('allTrips', 'All Trips')}
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {trips.length} Tours Registered (Newest Created First)
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold">
              Loading trips...
            </div>
          ) : trips.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-csk-slate border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 text-sm mb-4">No trips found in database.</p>
              <Link
                to="/create-trip"
                className="text-csk-blue dark:text-csk-yellow font-bold text-sm underline"
              >
                Create your first trip now →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="group relative p-5 rounded-2xl bg-white dark:bg-csk-slate border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-csk-yellow/50 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Title, ID Badge, and Delete Button */}
                    <div className="flex justify-between items-start gap-2">
                      <Link to={`/trip/${trip.id}`} className="flex-1">
                        <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-csk-blue dark:group-hover:text-csk-yellow transition line-clamp-1">
                          {trip.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          #{trip.id}
                        </span>

                        <button
                          onClick={(e) => handleDeleteTrip(e, trip.id, trip.title)}
                          title="Delete Trip"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-90"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Dates, Destination & Stay */}
                    <Link to={`/trip/${trip.id}`} className="block">
                      <p className="text-xs font-semibold text-csk-yellowDark dark:text-csk-yellow mt-2 flex items-center gap-1">
                        <span>📅</span>
                        {trip.startDate ? (
                          <span>
                            {trip.startDate} {trip.endDate ? `to ${trip.endDate}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Dates not specified</span>
                        )}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                        <span>📍</span> {trip.destination}
                      </p>

                      {trip.stayDetails && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
                          <span>🏨</span> {trip.stayDetails}
                        </p>
                      )}
                    </Link>
                  </div>

                  {/* Card Footer: Budget and View CTA */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Target Budget</p>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200">
                        ₹{(trip.estimatedBudget || trip.totalBudget || 0).toLocaleString()}
                      </p>
                    </div>

                    <Link
                      to={`/trip/${trip.id}`}
                      className="text-csk-blue dark:text-csk-yellow font-black group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}