const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths to JSON storage
const DATA_DIR = path.join(__dirname, 'data');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Helper to safely read JSON files
function readData(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
      return defaultVal;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultVal;
  }
}

// Helper to safely write JSON files
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
    return false;
  }
}

// Generate unique sequential or timestamped IDs
function generatePropertyId(properties) {
  const existingNums = properties
    .map(p => {
      const match = p.id && p.id.match(/^HP-ATX-(\d+)$/i);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);

  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  return `HP-ATX-${String(nextNum).padStart(3, '0')}`;
}

function generateBookingId(bookings) {
  const existingNums = bookings
    .map(b => {
      const match = b.id && b.id.match(/^BK-(\d+)$/i);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);

  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1001;
  return `BK-${nextNum}`;
}

// ==========================================
// 1. PROPERTIES API (SEARCH & CRUD)
// ==========================================

/**
 * GET /api/properties
 * Search & Filter endpoint (Supports n8n integration & combined filters)
 * Query parameters:
 *  - type: Land | Apartment | Villa | House | Townhouse | Condo
 *  - min_price: number (e.g. 500000)
 *  - max_price: number (e.g. 1500000)
 *  - neighborhood: string (e.g. "Downtown", "South Congress", "East Austin", etc.)
 *  - status: Available | Reserved | Sold
 *  - search: text search query matching title, description, address, neighborhood
 *  - sort: 'price_asc' | 'price_desc' | 'newest' | 'oldest'
 */
app.get('/api/properties', (req, res) => {
  try {
    let properties = readData(PROPERTIES_FILE);
    const {
      type,
      min_price,
      max_price,
      neighborhood,
      status,
      search,
      sort
    } = req.query;

    // Filter by Property Type (case-insensitive)
    if (type && type.trim() !== '' && type.toLowerCase() !== 'all') {
      const targetType = type.trim().toLowerCase();
      properties = properties.filter(
        p => p.type && p.type.toLowerCase() === targetType
      );
    }

    // Filter by Neighborhood (case-insensitive, partial match allowed)
    if (neighborhood && neighborhood.trim() !== '' && neighborhood.toLowerCase() !== 'all') {
      const targetNeighborhood = neighborhood.trim().toLowerCase();
      properties = properties.filter(
        p => p.neighborhood && p.neighborhood.toLowerCase().includes(targetNeighborhood)
      );
    }

    // Filter by Status (case-insensitive)
    if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
      const targetStatus = status.trim().toLowerCase();
      properties = properties.filter(
        p => p.status && p.status.toLowerCase() === targetStatus
      );
    }

    // Filter by Min Price
    if (min_price !== undefined && min_price !== '') {
      const min = Number(min_price);
      if (!isNaN(min)) {
        properties = properties.filter(p => Number(p.price) >= min);
      }
    }

    // Filter by Max Price
    if (max_price !== undefined && max_price !== '') {
      const max = Number(max_price);
      if (!isNaN(max)) {
        properties = properties.filter(p => Number(p.price) <= max);
      }
    }

    // Filter by generic Search term (title, description, neighborhood, address, type)
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      properties = properties.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sort === 'price_asc') {
      properties.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price_desc') {
      properties.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === 'oldest') {
      properties.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      // Default: newest first
      properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({
      success: true,
      count: properties.length,
      filters_applied: {
        type: type || null,
        min_price: min_price || null,
        max_price: max_price || null,
        neighborhood: neighborhood || null,
        status: status || null,
        search: search || null
      },
      data: properties
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id
 * Retrieve a single property by ID
 */
app.get('/api/properties/:id', (req, res) => {
  try {
    const properties = readData(PROPERTIES_FILE);
    const property = properties.find(
      p => p.id && p.id.toLowerCase() === req.params.id.toLowerCase()
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: `Property with ID '${req.params.id}' not found`
      });
    }

    res.json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/properties
 * Create a new property (Full CRUD)
 */
app.post('/api/properties', (req, res) => {
  try {
    const properties = readData(PROPERTIES_FILE);
    const body = req.body;

    // Required fields validation
    if (!body.title || !body.type || !body.price || !body.neighborhood) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, type, price, neighborhood are required'
      });
    }

    // Auto-generate unique ID if not provided or ensure non-repeating
    let newId = body.id ? String(body.id).trim() : generatePropertyId(properties);
    if (properties.some(p => p.id.toLowerCase() === newId.toLowerCase())) {
      newId = generatePropertyId(properties);
    }

    const defaultImagesByType = {
      'Condo': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'House': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'Villa': 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      'Apartment': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'Townhouse': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'Land': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
    };

    const newProperty = {
      id: newId,
      title: body.title.trim(),
      type: body.type.trim(),
      price: Number(body.price),
      description: body.description ? body.description.trim() : 'Exclusive property listing in Austin, TX.',
      neighborhood: body.neighborhood.trim(),
      address: body.address ? body.address.trim() : `${body.neighborhood}, Austin, TX`,
      bedrooms: body.bedrooms !== undefined ? Number(body.bedrooms) : (body.type === 'Land' ? 0 : 3),
      bathrooms: body.bathrooms !== undefined ? Number(body.bathrooms) : (body.type === 'Land' ? 0 : 2),
      area_sqft: body.area_sqft ? Number(body.area_sqft) : 1800,
      image_url: body.image_url ? body.image_url.trim() : (defaultImagesByType[body.type] || defaultImagesByType['House']),
      status: body.status ? body.status.trim() : 'Available',
      featured: Boolean(body.featured),
      created_at: new Date().toISOString()
    };

    properties.unshift(newProperty);
    writeData(PROPERTIES_FILE, properties);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: newProperty
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/properties/:id
 * Update an existing property (Full CRUD)
 */
app.put('/api/properties/:id', (req, res) => {
  try {
    const properties = readData(PROPERTIES_FILE);
    const index = properties.findIndex(
      p => p.id && p.id.toLowerCase() === req.params.id.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Property with ID '${req.params.id}' not found`
      });
    }

    const current = properties[index];
    const body = req.body;

    const updatedProperty = {
      ...current,
      title: body.title !== undefined ? body.title.trim() : current.title,
      type: body.type !== undefined ? body.type.trim() : current.type,
      price: body.price !== undefined ? Number(body.price) : current.price,
      description: body.description !== undefined ? body.description.trim() : current.description,
      neighborhood: body.neighborhood !== undefined ? body.neighborhood.trim() : current.neighborhood,
      address: body.address !== undefined ? body.address.trim() : current.address,
      bedrooms: body.bedrooms !== undefined ? Number(body.bedrooms) : current.bedrooms,
      bathrooms: body.bathrooms !== undefined ? Number(body.bathrooms) : current.bathrooms,
      area_sqft: body.area_sqft !== undefined ? Number(body.area_sqft) : current.area_sqft,
      image_url: body.image_url !== undefined ? body.image_url.trim() : current.image_url,
      status: body.status !== undefined ? body.status.trim() : current.status,
      featured: body.featured !== undefined ? Boolean(body.featured) : current.featured,
      updated_at: new Date().toISOString()
    };

    properties[index] = updatedProperty;
    writeData(PROPERTIES_FILE, properties);

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/properties/:id
 * Delete a property (Full CRUD)
 */
app.delete('/api/properties/:id', (req, res) => {
  try {
    const properties = readData(PROPERTIES_FILE);
    const index = properties.findIndex(
      p => p.id && p.id.toLowerCase() === req.params.id.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Property with ID '${req.params.id}' not found`
      });
    }

    const deleted = properties.splice(index, 1)[0];
    writeData(PROPERTIES_FILE, properties);

    res.json({
      success: true,
      message: 'Property deleted successfully',
      data: deleted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. BOOKINGS API (CREATE & CRUD FOR N8N)
// ==========================================

/**
 * GET /api/bookings
 * Retrieve bookings, with optional filters:
 *  - customer_email: filter bookings for a specific customer
 *  - property_id: filter bookings for a specific property
 *  - status: Pending | Confirmed | Cancelled
 */
app.get('/api/bookings', (req, res) => {
  try {
    let bookings = readData(BOOKINGS_FILE);
    const properties = readData(PROPERTIES_FILE);
    const propMap = new Map(properties.map(p => [p.id, p]));

    const { customer_email, property_id, status } = req.query;

    if (customer_email && customer_email.trim() !== '') {
      const email = customer_email.trim().toLowerCase();
      bookings = bookings.filter(
        b => b.customer_email && b.customer_email.toLowerCase() === email
      );
    }

    if (property_id && property_id.trim() !== '') {
      const pId = property_id.trim().toLowerCase();
      bookings = bookings.filter(
        b => b.property_id && b.property_id.toLowerCase() === pId
      );
    }

    if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
      const targetStatus = status.trim().toLowerCase();
      bookings = bookings.filter(
        b => b.status && b.status.toLowerCase() === targetStatus
      );
    }

    // Attach property details for convenience
    const enrichedBookings = bookings.map(b => {
      const prop = propMap.get(b.property_id);
      return {
        ...b,
        property_title: prop ? prop.title : 'Unknown Property',
        property_address: prop ? prop.address : 'Austin, TX',
        property_price: prop ? prop.price : null,
        property_image: prop ? prop.image_url : null,
        property_neighborhood: prop ? prop.neighborhood : null
      };
    });

    // Sort newest bookings first
    enrichedBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      count: enrichedBookings.length,
      data: enrichedBookings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve single booking by ID
 */
app.get('/api/bookings/:id', (req, res) => {
  try {
    const bookings = readData(BOOKINGS_FILE);
    const booking = bookings.find(
      b => b.id && b.id.toLowerCase() === req.params.id.toLowerCase()
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Booking with ID '${req.params.id}' not found`
      });
    }

    const properties = readData(PROPERTIES_FILE);
    const prop = properties.find(p => p.id === booking.property_id);

    res.json({
      success: true,
      data: {
        ...booking,
        property: prop || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bookings
 * Create a new booking for a given property (property_id + customer data)
 * Called from web frontend and n8n workflows
 */
app.post('/api/bookings', (req, res) => {
  try {
    const bookings = readData(BOOKINGS_FILE);
    const properties = readData(PROPERTIES_FILE);
    const body = req.body;

    // Required fields validation
    const requiredFields = ['property_id', 'customer_name', 'customer_email', 'customer_phone', 'booking_date'];
    const missing = requiredFields.filter(f => !body[f] || String(body[f]).trim() === '');
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required booking fields: ${missing.join(', ')}`
      });
    }

    // Verify property exists
    const property = properties.find(
      p => p.id && p.id.toLowerCase() === body.property_id.trim().toLowerCase()
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: `Cannot create booking. Property with ID '${body.property_id}' was not found.`
      });
    }

    const newBookingId = generateBookingId(bookings);

    const newBooking = {
      id: newBookingId,
      property_id: property.id,
      customer_name: body.customer_name.trim(),
      customer_email: body.customer_email.trim().toLowerCase(),
      customer_phone: body.customer_phone.trim(),
      booking_date: body.booking_date.trim(),
      booking_time: body.booking_time ? body.booking_time.trim() : '14:00',
      notes: body.notes ? body.notes.trim() : '',
      status: body.status && ['Pending', 'Confirmed', 'Cancelled'].includes(body.status)
        ? body.status
        : 'Pending',
      created_at: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    writeData(BOOKINGS_FILE, bookings);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        ...newBooking,
        property_title: property.title,
        property_address: property.address,
        property_price: property.price,
        property_neighborhood: property.neighborhood
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT or PATCH /api/bookings/:id
 * Update booking status or details (Confirm, Cancel, reschedule)
 */
const handleUpdateBooking = (req, res) => {
  try {
    const bookings = readData(BOOKINGS_FILE);
    const index = bookings.findIndex(
      b => b.id && b.id.toLowerCase() === req.params.id.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Booking with ID '${req.params.id}' not found`
      });
    }

    const current = bookings[index];
    const body = req.body;

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['Pending', 'Confirmed', 'Cancelled'];
      const matched = validStatuses.find(s => s.toLowerCase() === body.status.toLowerCase());
      if (matched) {
        body.status = matched;
      }
    }

    const updatedBooking = {
      ...current,
      customer_name: body.customer_name !== undefined ? body.customer_name.trim() : current.customer_name,
      customer_email: body.customer_email !== undefined ? body.customer_email.trim().toLowerCase() : current.customer_email,
      customer_phone: body.customer_phone !== undefined ? body.customer_phone.trim() : current.customer_phone,
      booking_date: body.booking_date !== undefined ? body.booking_date.trim() : current.booking_date,
      booking_time: body.booking_time !== undefined ? body.booking_time.trim() : current.booking_time,
      notes: body.notes !== undefined ? body.notes.trim() : current.notes,
      status: body.status !== undefined ? body.status : current.status,
      updated_at: new Date().toISOString()
    };

    bookings[index] = updatedBooking;
    writeData(BOOKINGS_FILE, bookings);

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.put('/api/bookings/:id', handleUpdateBooking);
app.patch('/api/bookings/:id', handleUpdateBooking);

/**
 * DELETE /api/bookings/:id
 * Delete a booking (Admin action / Full CRUD)
 */
app.delete('/api/bookings/:id', (req, res) => {
  try {
    const bookings = readData(BOOKINGS_FILE);
    const index = bookings.findIndex(
      b => b.id && b.id.toLowerCase() === req.params.id.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Booking with ID '${req.params.id}' not found`
      });
    }

    const deleted = bookings.splice(index, 1)[0];
    writeData(BOOKINGS_FILE, bookings);

    res.json({
      success: true,
      message: 'Booking deleted successfully',
      data: deleted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. AUTHENTICATION & USER HELPERS
// ==========================================

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const users = readData(USERS_FILE);
    const normalizedEmail = email.trim().toLowerCase();
    let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      // If logging in with admin address
      const isEmailAdmin = normalizedEmail.includes('admin');
      user = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        name: normalizedEmail.split('@')[0].replace('.', ' '),
        email: normalizedEmail,
        phone: '(512) 555-0100',
        role: role || (isEmailAdmin ? 'admin' : 'customer'),
        created_at: new Date().toISOString()
      };
      users.push(user);
      writeData(USERS_FILE, users);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/register
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const users = readData(USERS_FILE);
    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const newUser = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '(512) 555-0150',
      role: normalizedEmail.includes('admin') ? 'admin' : 'customer',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System stats endpoint for Admin Dashboard
app.get('/api/stats', (req, res) => {
  try {
    const properties = readData(PROPERTIES_FILE);
    const bookings = readData(BOOKINGS_FILE);

    const stats = {
      total_properties: properties.length,
      available_properties: properties.filter(p => p.status === 'Available').length,
      reserved_properties: properties.filter(p => p.status === 'Reserved').length,
      sold_properties: properties.filter(p => p.status === 'Sold').length,
      total_bookings: bookings.length,
      pending_bookings: bookings.filter(b => b.status === 'Pending').length,
      confirmed_bookings: bookings.filter(b => b.status === 'Confirmed').length,
      cancelled_bookings: bookings.filter(b => b.status === 'Cancelled').length,
      total_portfolio_value: properties.reduce((acc, p) => acc + (Number(p.price) || 0), 0)
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Horizon Properties Server running on http://localhost:${PORT}`);
  console.log(`- Austin properties database loaded from: ${PROPERTIES_FILE}`);
  console.log(`- Bookings database loaded from: ${BOOKINGS_FILE}`);
});
