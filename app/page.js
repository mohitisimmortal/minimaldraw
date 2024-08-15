'use client';

import { getContract } from '@/utils/minimalcontract';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lotteryEndTime, setLotteryEndTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState('');
  const [winner, setWinner] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState('');
  const [soldTickets, setSoldTickets] = useState([]);


  useEffect(() => {
    const connectWallet = async () => {
      const cp = await getContract();
      if (cp) {
        setConnected(true);

        const admin = await cp.admin();
        const signerAddress = await cp.signer.getAddress();
        setIsAdmin(admin === signerAddress);

        const endTime = await cp.lotteryEndTime();
        setLotteryEndTime(endTime.toNumber());
        const lastWinner = await cp.winner();
        setWinner(lastWinner); // Fetch and set the last winner

        setIsSettling(false); // Reset UI settling state
      }
    };

    connectWallet();
  }, []);

  useEffect(() => {
    if (lotteryEndTime > 0) {
      const interval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);
        let timeLeft = lotteryEndTime - currentTime;
        console.log('Current Time:', currentTime, 'Lottery End Time:', lotteryEndTime, 'Time Left:', timeLeft);

        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          setRemainingTime(`${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`);
        } else {
          setRemainingTime('0:00');
          setIsSettling(true); // Show "Previous draw is settling..." message
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lotteryEndTime]);

  const fetchWinnerAndReset = async () => {
    const cp =await getContract();
    try {
      const winnerAddress = await cp.winner();
      setWinner(winnerAddress);
      setIsSettling(false); // Reset settling status after fetching the winner
      setLotteryEndTime(0); // Reset the lottery end time to indicate the draw is complete
      setSoldTickets([]); // Clear sold tickets, making them available again

    } catch (err) {
      setError('Failed to fetch winner.');
      console.error(err);
      setIsSettling(false); // Reset settling status even on error
    }
  };

  useEffect(() => {
    if (isSettling) {
      // Introduce a delay before fetching the winner
      const delay = setTimeout(() => {
        fetchWinnerAndReset();
      }, 50000); // 50 seconds delay to allow Chainlink Keepers to update the contract

      return () => clearTimeout(delay);
    }
  }, [isSettling]);


  const buyTicket = async (ticketNumber) => {
    const cp =await getContract();
    try {
      const tx = await cp.buyTicket({ value: ethers.utils.parseEther('0.0001') });
      await tx.wait();
      alert(`Ticket ${ticketNumber} purchased!`);

      // Update the lottery end time after the first ticket is purchased
      const endTime = await cp.lotteryEndTime();
      setLotteryEndTime(endTime.toNumber());

      // Mark the ticket as sold
      setSoldTickets((prevSoldTickets) => [...prevSoldTickets, ticketNumber]);
    } catch (err) {
      setError('Failed to purchase ticket.');
      console.error(err);
    }
  };


  return (
    <>
      <header>
        <p className="text-white flex justify-center items-center text-sm pt-2 pb-1 lg:text-lg">Minimal Draw</p>
        <hr
          className="border-0 w-11/12 mx-auto"
          style={{ background: 'linear-gradient(to right, transparent, gray, transparent)', height: '.8px' }}
        />
      </header>

      <div className="relative mt-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#142251] to-[#2D4DB7] opacity-40"></div>
        <p className="relative whitespace-nowrap text-white text-sm px-2 animate-slide-infinite lg:animate-slide-infinite-25s">
          Participate in a draw to win 90% of the whole amount collected from sold tickets.
        </p>
      </div>

      <div className="text-white flex flex-col items-center justify-center mt-10">
        {connected ?
          (
            <>
              {isSettling ?
                (
                  <p className="text-yellow-500 text-sm mt-4">
                    Previous draw is settling, please wait for a minute...
                  </p>
                ) :
                (
                  <>
                    {/* <button onClick={buyTicket} className="bg-green-500 text-white p-2 rounded mt-4">
                      Buy Ticket
                    </button> */}
                    <div className="text-white flex flex-col items-center justify-center mt-10">
                      <p className="lg:text-lg">Tickets Available</p>

                      <ul className="flex gap-3 mt-3 items-center justify-center">
                        {Array.from({ length: 5 }, (_, i) => i + 1).map((ticketNumber) => (
                          <li
                            key={ticketNumber}
                            className={`${soldTickets.includes(ticketNumber)
                                ? "bg-gray-400 text-gray-800 cursor-not-allowed"
                                : "bg-white text-black hover:cursor-pointer"
                              } pl-2 pr-2 rounded text-sm lg:text-lg`}
                            onClick={
                              soldTickets.includes(ticketNumber)
                                ? null
                                : () => buyTicket(ticketNumber)
                            }
                          >
                            {ticketNumber}
                          </li>
                        ))}
                      </ul>

                      <ul className="flex gap-3 mt-3 items-center justify-center">
                        {Array.from({ length: 5 }, (_, i) => i + 6).map((ticketNumber) => (
                          <li
                            key={ticketNumber}
                            className={`${soldTickets.includes(ticketNumber)
                                ? "bg-gray-400 text-gray-800 cursor-not-allowed"
                                : "bg-white text-black hover:cursor-pointer"
                              } pl-2 pr-2 rounded text-sm lg:text-lg`}
                            onClick={
                              soldTickets.includes(ticketNumber)
                                ? null
                                : () => buyTicket(ticketNumber)
                            }
                          >
                            {ticketNumber}
                          </li>
                        ))}
                      </ul>
                    </div>


                    {
                      lotteryEndTime > 0 ? (<p className="mt-4">Draw ends in - {remainingTime}</p>) : (<p className="text-sm mt-4">Buy a ticket to start the draw</p>)
                    }
                  </>
                )
              }
              {error && <p className="text-red-500 mt-4">{error}</p>}
            </>
          ) : (
            <p>Please connect your MetaMask wallet to participate.</p>
          )}
      </div>

      <div className="relative mt-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#142251] to-[#2D4DB7] opacity-40"></div>
        <p className="relative whitespace-nowrap text-white text-sm px-2 animate-slide-infinite lg:animate-slide-infinite-25s">
          Previous winner - {winner || 'No winner yet'}
        </p>
      </div>
    </>
  );
}
